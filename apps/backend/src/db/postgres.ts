import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql as drizzleSql } from 'drizzle-orm';

export { drizzleSql as dbSql };

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://icrm:icrm_dev@localhost:5433/icrm_dev';

// sql is the raw postgres-js client (used for health checks, migrate.ts etc.)
export const sql = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(sql);

/**
 * Wraps a query block in a transaction where every query is scoped to a
 * single firm via the Postgres session setting app.current_firm_id.
 * The RLS policy on the users table reads this setting, so cross-tenant
 * data leakage is prevented at the database engine level.
 */
export async function withFirmContext<T>(
  firmId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Drop to the non-superuser app role so RLS policies are enforced.
    // SET LOCAL ROLE is transaction-scoped and resets automatically on commit/rollback.
    await tx.execute(drizzleSql`SET LOCAL ROLE icrm_app`);
    await tx.execute(drizzleSql`SELECT set_app_context(${firmId})`);
    return fn(tx as unknown as typeof db);
  });
}

process.on('SIGTERM', async () => {
  await sql.end();
});
