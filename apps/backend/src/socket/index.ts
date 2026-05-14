import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import type { Server as HttpServer } from 'http';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocketUser {
  id: string;
  firmId: string;
  role: string;
}

declare module 'socket.io' {
  interface SocketData {
    user: SocketUser;
  }
}

// ─── Module-level io instance ─────────────────────────────────────────────────

let io: Server;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveOrigins(): string | string[] {
  const raw =
    process.env.SOCKET_ALLOWED_ORIGINS ||
    process.env.APP_BASE_URL ||
    process.env.CLIENT_URL ||
    '';
  if (!raw) return '*';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function redisUrl(): string {
  return process.env.REDIS_URL ?? 'redis://localhost:6379';
}

// ─── JWT authentication middleware ───────────────────────────────────────────

async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Unauthorized'));

  try {
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? '';
    const decoded = jwt.verify(token, secret) as Record<string, string>;

    // Support both new Postgres JWTs (firm_id, user_id) and legacy Mongo JWTs (id)
    const firmId = decoded.firm_id;
    const userId = decoded.user_id ?? decoded.id;
    const role = decoded.role ?? 'admin';

    if (!firmId || !userId) {
      return next(new Error('Unauthorized'));
    }

    socket.data.user = { id: userId, firmId, role };
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
}

// ─── initSocket ───────────────────────────────────────────────────────────────

export async function initSocket(server: HttpServer): Promise<void> {
  const origins = deriveOrigins();
  const originsArr = Array.isArray(origins) ? origins : [origins];

  io = new Server(server, {
    cors: {
      origin: originsArr.length === 1 && originsArr[0] === '*' ? '*' : originsArr,
      credentials: true,
    },
  });

  // Redis adapter: enables horizontal scaling and cross-process event delivery.
  // Skipped in test environments where Redis is not available.
  if (process.env.NODE_ENV !== 'test') {
    const url = redisUrl();
    const pubClient = new Redis(url, { lazyConnect: true });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[socket] Redis adapter attached');
  }

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { id: userId, firmId, role } = socket.data.user;

    // Primary firm-scoped rooms
    socket.join(`firm:${firmId}`);
    socket.join(`firm:${firmId}:user:${userId}`);

    // Legacy rooms — kept for backward compat with old MongoDB-backed code
    // that still emits to 'admins' or 'user:<id>'. Remove after full migration.
    socket.join(`user:${userId}`);
    if (role === 'admin') {
      socket.join('admins');
    }

    // Backfill: deliver last 20 unread notifications from Postgres on connect.
    // Deferred with setImmediate to avoid blocking the connection handshake.
    setImmediate(async () => {
      try {
        const { listForUser } = await import(
          '../modules/notifications/notifications.service.js'
        );
        const { withFirmContext, db } = await import('../db/postgres.js');
        const result = await withFirmContext(firmId, (tx: typeof db) =>
          listForUser(tx, userId, { unreadOnly: true, limit: 20 }),
        );
        socket.emit('notification:backfill', {
          notifications: result.notifications,
          unreadCount: result.meta.total,
        });
      } catch (err: unknown) {
        console.error(
          '[socket] Notification backfill failed:',
          (err as Error).message,
        );
      }
    });

    socket.on('disconnect', () => {
      // Reserved for future connection analytics
    });
  });
}

// ─── Instance accessor ────────────────────────────────────────────────────────

export const getIo = (): Server => {
  if (!io) throw new Error('Socket server is not initialized');
  return io;
};

// ─── Firm-scoped emitters (preferred — use these in all new code) ─────────────

/** Broadcast an event to every connected user in the firm. */
export const emitToFirm = (
  firmId: string,
  event: string,
  payload: unknown,
): void => {
  try {
    getIo().to(`firm:${firmId}`).emit(event, payload);
  } catch (err: unknown) {
    console.warn('[socket] emitToFirm failed:', (err as Error).message);
  }
};

/** Deliver an event to a single user's private channel within a firm. */
export const emitToUser = (
  firmId: string,
  userId: string,
  event: string,
  payload: unknown,
): void => {
  try {
    getIo().to(`firm:${firmId}:user:${userId}`).emit(event, payload);
  } catch (err: unknown) {
    console.warn('[socket] emitToUser failed:', (err as Error).message);
  }
};

// ─── Legacy emitters (backward compat — deprecated) ──────────────────────────
// Still consumed by the Mongoose-backed task.service.js and student.controller.js.
// Provide firmId when available; falls back to old room names without it.
// These will be removed once those callers are fully migrated.

export const emitTaskCreated = (task: unknown, firmId?: string): void => {
  try {
    const instance = getIo();
    if (firmId) {
      instance.to(`firm:${firmId}`).emit('task:created', task);
    } else {
      // Legacy fallback — broadcasts to all admins regardless of firm
      instance.to('admins').emit('task:created', task);
    }
  } catch (err: unknown) {
    console.warn('[socket] emitTaskCreated failed:', (err as Error).message);
  }
};

export const emitTaskUpdated = (task: unknown, firmId?: string): void => {
  try {
    const instance = getIo();
    if (firmId) {
      instance.to(`firm:${firmId}`).emit('task:updated', task);
    } else {
      instance.to('admins').emit('task:updated', task);
    }
  } catch (err: unknown) {
    console.warn('[socket] emitTaskUpdated failed:', (err as Error).message);
  }
};

export const emitNotification = (
  notification: Record<string, unknown>,
): void => {
  try {
    const instance = getIo();
    const recipientId =
      (notification.user_id as string) ??
      (notification.recipientUserId as { toString?(): string } | undefined)
        ?.toString?.() ??
      (notification.recipientUserId as string);
    const firmId = notification.firm_id as string | undefined;

    if (firmId && recipientId) {
      // New firm-scoped path
      instance
        .to(`firm:${firmId}:user:${recipientId}`)
        .emit('notification:new', notification);
    } else if (recipientId) {
      // Legacy path — user-only room (no firm scoping)
      instance.to(`user:${recipientId}`).emit('notification:new', notification);
    }
  } catch (err: unknown) {
    console.warn('[socket] emitNotification failed:', (err as Error).message);
  }
};
