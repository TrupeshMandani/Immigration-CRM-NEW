/**
 * Integration test: Row-Level Security on the users table.
 *
 * Requires a running Postgres at DATABASE_URL with:
 *   - firms and users tables created (run pnpm db:migrate first)
 *   - tenant_isolation policy and set_app_context() applied
 *   - icrm_app role created with table grants (also applied by db:migrate)
 *
 * Why icrm_app?  Postgres superusers bypass RLS unconditionally.
 * The icrm owner account is a superuser (used for migrations), so all app
 * queries that should be subject to RLS must run as icrm_app.
 * withFirmContext() sets LOCAL ROLE icrm_app automatically; the helper
 * `asAppRole` below does the same for queries that intentionally have no
 * firm context (to prove RLS blocks them).
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, dbSql, sql as pgClient, withFirmContext } from '../postgres';
import { firms } from '../schema/firms';
import { users } from '../schema/users';

/** Run a query as icrm_app (non-superuser) without setting firm context. */
async function asAppRole<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(dbSql`SET LOCAL ROLE icrm_app`);
    return fn(tx as unknown as typeof db);
  });
}

let firmAId: string;
let firmBId: string;

beforeAll(async () => {
  const tag = Date.now();

  const [firmA] = await db
    .insert(firms)
    .values({ name: 'Test Firm A', slug: `test-firm-a-${tag}` })
    .returning();
  firmAId = firmA.id;

  const [firmB] = await db
    .insert(firms)
    .values({ name: 'Test Firm B', slug: `test-firm-b-${tag}` })
    .returning();
  firmBId = firmB.id;

  // Inserts run inside withFirmContext so the RLS WITH CHECK expression
  // (same as USING: firm_id = current_setting(...)) is satisfied.
  await withFirmContext(firmAId, (tx) =>
    tx.insert(users).values({
      firm_id: firmAId,
      email: 'alice@firma.test',
      password_hash: 'hash-a',
      role: 'admin',
    }),
  );

  await withFirmContext(firmBId, (tx) =>
    tx.insert(users).values({
      firm_id: firmBId,
      email: 'bob@firmb.test',
      password_hash: 'hash-b',
      role: 'admin',
    }),
  );
});

afterAll(async () => {
  // Deleting firms cascades to users. No RLS on the firms table.
  if (firmAId) await db.delete(firms).where(eq(firms.id, firmAId));
  if (firmBId) await db.delete(firms).where(eq(firms.id, firmBId));
  await pgClient.end();
});

describe('RLS: tenant isolation on users table', () => {
  it('withFirmContext(A) returns only Firm A user', async () => {
    const rows = await withFirmContext(firmAId, (tx) =>
      tx.select().from(users),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].firm_id).toBe(firmAId);
    expect(rows[0].email).toBe('alice@firma.test');
  });

  it('withFirmContext(B) returns only Firm B user', async () => {
    const rows = await withFirmContext(firmBId, (tx) =>
      tx.select().from(users),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].firm_id).toBe(firmBId);
    expect(rows[0].email).toBe('bob@firmb.test');
  });

  it('query without context returns zero rows (RLS blocks all)', async () => {
    // Run as icrm_app but WITHOUT calling set_app_context.
    // app.current_firm_id is unset → policy evaluates (firm_id = NULL) → false
    // → zero rows visible.
    const rows = await asAppRole((tx) => tx.select().from(users));
    expect(rows).toHaveLength(0);
  });
});
