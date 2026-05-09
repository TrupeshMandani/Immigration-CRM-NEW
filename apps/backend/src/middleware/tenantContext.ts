import { Request, Response, NextFunction } from 'express';
import { dbSql, db } from '../db/postgres';

// ---------------------------------------------------------------------------
// Type augmentations
// ---------------------------------------------------------------------------
// req.context is set by auth.js; re-declared here for TypeScript.
// req.db    is set by this middleware for every authenticated request.
//
// WARNING — do NOT mount this middleware on long-lived connections:
//   - Server-Sent Events (SSE): the response never calls 'finish' until the
//     client disconnects, so the Postgres transaction would stay open
//     indefinitely, exhausting the connection pool.
//   - WebSockets: same problem. Use withFirmContext() directly inside those
//     handlers instead.
//   Add the path prefix to EXEMPT_PREFIXES below to opt-out.
// ---------------------------------------------------------------------------
declare global {
  namespace Express {
    interface Request {
      context?: { firmId: string; userId: string; role: string };
      db: typeof db;
    }
  }
}

/** Paths that skip tenant middleware entirely (public + long-lived streams). */
const EXEMPT_PREFIXES = [
  '/api/auth',
  '/api/contact',
  // Streaming / SSE routes (add here when implemented):
  // '/api/ai/stream',
];

export async function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Skip exempt paths
  for (const prefix of EXEMPT_PREFIXES) {
    if (req.originalUrl.startsWith(prefix)) {
      return next();
    }
  }

  const firmId = req.context?.firmId;
  if (!firmId) {
    res.status(401).json({ message: 'Tenant context required — authenticate first' });
    return;
  }

  // -------------------------------------------------------------------------
  // Transaction gate pattern
  //
  // We start a Drizzle transaction but do NOT await it here. Inside the
  // transaction callback we:
  //   1. Drop to icrm_app role (so RLS is enforced — superuser bypasses it).
  //   2. Call set_app_context(firmId) to set the per-tx session variable.
  //   3. Signal that req.db is ready, then pause on `commitGate`.
  //
  // `commitGate` resolves when res.finish fires (commit) or rejects on
  // res.close / error status (rollback). Both are LOCAL to this transaction,
  // so the connection is returned to the pool after every request.
  // -------------------------------------------------------------------------
  let resolveCommit!: () => void;
  let rejectCommit!: (e: Error) => void;
  let settled = false;

  /** Ensures we commit/rollback exactly once, regardless of event order. */
  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    fn();
  };

  const commitGate = new Promise<void>((resolve, reject) => {
    resolveCommit = resolve;
    rejectCommit = reject;
  });

  let signalDbReady!: (tx: typeof db) => void;
  let signalDbError!: (e: Error) => void;

  const dbReadyPromise = new Promise<typeof db>((resolve, reject) => {
    signalDbReady = resolve;
    signalDbError = reject;
  });

  // Start the transaction — intentionally NOT awaited.
  db.transaction(async (tx) => {
    try {
      await tx.execute(dbSql`SET LOCAL ROLE icrm_app`);
      await tx.execute(dbSql`SELECT set_app_context(${firmId})`);
      signalDbReady(tx as unknown as typeof db);
      await commitGate; // Hold the connection open until the response is done.
    } catch (e) {
      signalDbError(e instanceof Error ? e : new Error(String(e)));
      throw e; // Re-throw so Drizzle rolls back the transaction.
    }
  }).catch((err) => {
    // Catches failures that occur before the callback runs (e.g. pool exhausted)
    // and rollback-caused rejections from rejectCommit(). Both are expected.
    signalDbError(err instanceof Error ? err : new Error(String(err)));
  });

  // Commit on a successful response (2xx / 3xx), rollback on anything else.
  res.on('finish', () =>
    settle(() => {
      if (res.statusCode < 400) {
        resolveCommit();
      } else {
        rejectCommit(new Error(`Response status ${res.statusCode}`));
      }
    }),
  );

  // Client disconnected before the response was fully sent.
  res.on('close', () =>
    settle(() => rejectCommit(new Error('Client disconnected'))),
  );

  // Once the DB transaction is set up, attach it to the request and continue.
  dbReadyPromise
    .then((tx) => {
      req.db = tx;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
