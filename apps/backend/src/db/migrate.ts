import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://icrm:icrm_dev@localhost:5433/icrm_dev';

async function applyCustomSql(client: postgres.Sql, filePath: string) {
  const raw = readFileSync(filePath, 'utf8');
  // Split on the Drizzle statement-breakpoint marker
  const statements = raw
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.unsafe(statement);
  }
  console.log(`Custom SQL applied: ${filePath}`);
}

async function main() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  console.log('Applying pending migrations…');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Drizzle migrations done.');

  // Hand-written migrations run after Drizzle's managed ones.
  // Each is idempotent (DROP IF EXISTS / CREATE OR REPLACE / etc.).
  await applyCustomSql(client, join(__dirname, '../../drizzle/0002_rls_users.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0003_rls_applicants_documents.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0004_ai_jobs.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0005_tasks.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0006_notifications.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0007_billing.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0008_cases_module.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0009_cases_matter_number_scope.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0010_deadlines.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0011_applicant_chat_messages.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0012_generated_documents.sql'));
  await applyCustomSql(client, join(__dirname, '../../drizzle/0013_applicant_status_outcomes.sql'));

  console.log('All migrations applied.');
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
