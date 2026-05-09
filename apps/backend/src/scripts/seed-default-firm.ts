import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { firms } from '../db/schema/firms';
import { eq } from 'drizzle-orm';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://icrm:icrm_dev@localhost:5433/icrm_dev';

async function main() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  const existing = await db.select().from(firms).where(eq(firms.slug, 'default')).limit(1);

  if (existing.length > 0) {
    console.log('Default firm already exists. UUID:', existing[0].id);
    await client.end();
    process.exit(0);
  }

  const [firm] = await db
    .insert(firms)
    .values({ name: 'Default Firm', slug: 'default' })
    .returning();

  console.log('Created default firm. UUID:', firm.id);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
