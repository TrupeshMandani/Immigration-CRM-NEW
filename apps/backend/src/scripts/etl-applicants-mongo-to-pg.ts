/**
 * One-shot ETL: copies Applicant documents from MongoDB into the Postgres
 * applicants table.
 *
 * Run:
 *   npx tsx src/scripts/etl-applicants-mongo-to-pg.ts
 *
 * Safety:
 *   - Idempotent: skips any applicant whose ai_key already exists in Postgres.
 *   - Does NOT migrate embedded documents, tasks, or requiredDocuments — those
 *     are migrated in Prompts 10 and 12 respectively.
 *   - Does NOT delete the Mongoose documents; the MongoDB collection remains
 *     intact until all embeddings are migrated.
 *
 * All applicants are assigned to the DEFAULT_FIRM_ID from .env.
 * After running, verify with:
 *   pnpm db:studio  →  select count(*) from applicants;
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql as drizzleSql, eq } from 'drizzle-orm';
import { applicants } from '../db/schema/applicants';

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ImmigrationCRM';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://icrm:icrm_dev@localhost:5433/icrm_dev';
const DEFAULT_FIRM_ID = process.env.DEFAULT_FIRM_ID ?? '';

if (!DEFAULT_FIRM_ID) {
  console.error('DEFAULT_FIRM_ID is not set in .env. Cannot assign firm.');
  process.exit(1);
}

// Minimal Mongoose schema — only the fields we need for ETL.
const mongoSchema = new mongoose.Schema({
  aiKey: String,
  email: String,
  username: String,
  status: String,
  contactInfo: mongoose.Schema.Types.Mixed,
  profile: mongoose.Schema.Types.Mixed,
  preferences: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
const MongoApplicant = mongoose.model('Applicant', mongoSchema);

function splitName(full?: string): { first: string | null; last: string | null } {
  if (!full || !full.trim()) return { first: null, last: null };
  const parts = full.trim().split(/\s+/);
  return {
    first: parts[0] ?? null,
    last: parts.slice(1).join(' ') || null,
  };
}

async function main() {
  // Connect to both databases
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const pgClient = postgres(DATABASE_URL, { max: 5 });
  const db = drizzle(pgClient);
  console.log('Connected to Postgres.');

  // Fetch all applicants from MongoDB
  const mongoApplicants = await MongoApplicant.find({}).lean();
  console.log(`Found ${mongoApplicants.length} MongoDB applicants.`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const s of mongoApplicants) {
    const aiKey = s.aiKey as string | undefined;
    if (!aiKey) {
      console.warn(`Skipping applicant with no aiKey: ${s._id}`);
      skipped++;
      continue;
    }

    // Check if already migrated
    const existing = await db
      .select({ id: applicants.id })
      .from(applicants)
      .where(eq(applicants.ai_key, aiKey))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const email =
      (s.email as string | undefined) ||
      (s.username as string | undefined) ||
      ((s.contactInfo as any)?.email as string | undefined);

    if (!email) {
      console.warn(`Skipping applicant ${aiKey} — no email.`);
      skipped++;
      continue;
    }

    const contactName = (s.contactInfo as any)?.name as string | undefined;
    const profileName = (s.profile as any)?.fullName as string | undefined;
    const { first, last } = splitName(contactName ?? profileName);

    const mongoStatus = (s.status as string | undefined) ?? 'registered';
    const pgStatus = ['pending', 'registered', 'active'].includes(mongoStatus)
      ? mongoStatus
      : 'registered';

    // Merge contactInfo + profile into profile_data jsonb
    const profile_data = {
      ...(typeof s.profile === 'object' && s.profile ? s.profile : {}),
      contactInfo: s.contactInfo ?? {},
      preferences: s.preferences ?? {},
    };

    try {
      // Insert without firm context (we bypass RLS by running as superuser icrm).
      await db.insert(applicants).values({
        firm_id: DEFAULT_FIRM_ID,
        email: email.toLowerCase(),
        first_name: first,
        last_name: last,
        status: pgStatus as 'pending' | 'registered' | 'active' | 'closed',
        stage: 'lead',
        ai_key: aiKey,
        profile_data,
        state_data: {},
      });
      inserted++;
      console.log(`  ✓  ${aiKey} (${email})`);
    } catch (err: any) {
      // Unique constraint on (firm_id, email) — may already exist with diff aiKey
      if (err.code === '23505') {
        console.warn(`  ⚠  Duplicate email ${email} — skipping ${aiKey}.`);
        skipped++;
      } else {
        console.error(`  ✗  ${aiKey}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nETL complete.  Inserted: ${inserted}  Skipped: ${skipped}  Errors: ${errors}`);

  await mongoose.disconnect();
  await pgClient.end();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('ETL failed:', err);
  process.exit(1);
});
