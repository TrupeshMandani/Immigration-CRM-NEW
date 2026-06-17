import { eq, ilike, or, and, type SQL } from 'drizzle-orm';
import { db } from '../../db/postgres';
import { applicants, type Applicant, type NewApplicant } from '../../db/schema/applicants';
import {
  CreateApplicantSchema,
  UpdateApplicantSchema,
  ApplicantFiltersSchema,
  type CreateApplicantInput,
  type UpdateApplicantInput,
  type ApplicantFilters,
} from '@icrm/shared-types/applicants';

type DbClient = typeof db;

// ---------------------------------------------------------------------------
// ai_key generator — URL-safe, human-readable, unique enough for dev.
// Follows the existing pattern from the Mongoose model.
// ---------------------------------------------------------------------------
function generateAiKey(email: string): string {
  const prefix = email.split('@')[0]?.replace(/[^a-z0-9]/gi, '').slice(0, 12) ?? 'applicant';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${suffix}`;
}

// ---------------------------------------------------------------------------
// listApplicants
// ---------------------------------------------------------------------------
export async function listApplicants(
  dbClient: DbClient,
  filters?: ApplicantFilters,
): Promise<Applicant[]> {
  const parsed = ApplicantFiltersSchema.parse(filters ?? {});

  const conditions: SQL[] = [];

  if (parsed.status) {
    conditions.push(eq(applicants.status, parsed.status));
  }
  if (parsed.stage) {
    conditions.push(eq(applicants.stage, parsed.stage));
  }
  if (parsed.search) {
    const pattern = `%${parsed.search}%`;
    conditions.push(
      or(
        ilike(applicants.email, pattern),
        ilike(applicants.first_name, pattern),
        ilike(applicants.last_name, pattern),
      ) as SQL,
    );
  }

  const query = dbClient
    .select()
    .from(applicants)
    .limit(parsed.limit)
    .offset(parsed.offset)
    .orderBy(applicants.created_at);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

// ---------------------------------------------------------------------------
// getApplicantById
// ---------------------------------------------------------------------------
export async function getApplicantById(
  dbClient: DbClient,
  id: string,
): Promise<Applicant | null> {
  const rows = await dbClient
    .select()
    .from(applicants)
    .where(eq(applicants.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// getApplicantByAiKey — used by MCP agent lookup
// ---------------------------------------------------------------------------
export async function getApplicantByAiKey(
  dbClient: DbClient,
  aiKey: string,
): Promise<Applicant | null> {
  const rows = await dbClient
    .select()
    .from(applicants)
    .where(eq(applicants.ai_key, aiKey))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// createApplicant
// ---------------------------------------------------------------------------
export async function createApplicant(
  dbClient: DbClient,
  firmId: string,
  input: CreateApplicantInput,
): Promise<Applicant> {
  const parsed = CreateApplicantSchema.parse(input);

  const aiKey = parsed.ai_key ?? generateAiKey(parsed.email);

  const newApplicant: NewApplicant = {
    firm_id: firmId,
    email: parsed.email,
    first_name: parsed.first_name ?? null,
    last_name: parsed.last_name ?? null,
    status: parsed.status,
    stage: parsed.stage,
    ai_key: aiKey,
    profile_data: parsed.profile_data,
    state_data: parsed.state_data,
    assigned_to: parsed.assigned_to ?? null,
  };

  const rows = await dbClient.insert(applicants).values(newApplicant).returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// updateApplicant
// ---------------------------------------------------------------------------
export async function updateApplicant(
  dbClient: DbClient,
  id: string,
  patch: UpdateApplicantInput,
): Promise<Applicant> {
  const parsed = UpdateApplicantSchema.parse(patch);

  // Remove undefined keys so we only SET what was actually provided.
  const updates = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Partial<NewApplicant>;

  updates.updated_at = new Date();

  const rows = await dbClient
    .update(applicants)
    .set(updates)
    .where(eq(applicants.id, id))
    .returning();

  if (!rows[0]) {
    throw Object.assign(new Error('Applicant not found'), { statusCode: 404 });
  }
  return rows[0];
}

// ---------------------------------------------------------------------------
// updateApplicantStage
// ---------------------------------------------------------------------------
export async function updateApplicantStage(
  dbClient: DbClient,
  id: string,
  newStage: string,
): Promise<Applicant> {
  const { stage } = UpdateApplicantSchema.pick({ stage: true }).parse({ stage: newStage });
  return updateApplicant(dbClient, id, { stage });
}

// ---------------------------------------------------------------------------
// deleteApplicant  (soft — sets status = 'closed')
// ---------------------------------------------------------------------------
export async function deleteApplicant(
  dbClient: DbClient,
  id: string,
): Promise<Applicant> {
  const rows = await dbClient
    .update(applicants)
    .set({ status: 'closed', updated_at: new Date() })
    .where(eq(applicants.id, id))
    .returning();

  if (!rows[0]) {
    throw Object.assign(new Error('Applicant not found'), { statusCode: 404 });
  }
  return rows[0];
}

// ---------------------------------------------------------------------------
// Re-export types so route handlers can import from one place
// ---------------------------------------------------------------------------
export type { CreateApplicantInput, UpdateApplicantInput, ApplicantFilters };
