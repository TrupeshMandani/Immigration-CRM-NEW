import { eq, ilike, or, and, gte, desc, type SQL, sql } from 'drizzle-orm';
import { db } from '../../db/postgres';
import { cases, type Case, type NewCase } from '../../db/schema/cases';
import { caseEvents, type CaseEvent, type NewCaseEvent } from '../../db/schema/case_events';
import {
  CreateCaseSchema,
  UpdateCaseSchema,
  CaseFiltersSchema,
  type CreateCaseInput,
  type UpdateCaseInput,
  type CaseFilters,
} from '@icrm/shared-types/cases';

type DbClient = typeof db;

// ---------------------------------------------------------------------------
// generateMatterNumber
// RLS is active on dbClient — count is automatically scoped to firm.
// ---------------------------------------------------------------------------
async function generateMatterNumber(dbClient: DbClient, firmId: string): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);

  const [{ count }] = await dbClient
    .select({ count: sql<number>`count(*)::int` })
    .from(cases)
    .where(gte(cases.created_at, startOfYear));

  const seq = String((count ?? 0) + 1).padStart(5, '0');
  return `ICRM-${year}-${seq}`;
}

// ---------------------------------------------------------------------------
// listCases
// ---------------------------------------------------------------------------
export async function listCases(dbClient: DbClient, filters?: CaseFilters): Promise<Case[]> {
  const parsed = CaseFiltersSchema.parse(filters ?? {});

  const conditions: SQL[] = [];

  if (parsed.case_type) conditions.push(eq(cases.case_type, parsed.case_type));
  if (parsed.status) conditions.push(eq(cases.status, parsed.status));
  if (parsed.assigned_to) conditions.push(eq(cases.assigned_to, parsed.assigned_to));
  if (parsed.applicant_id) conditions.push(eq(cases.applicant_id, parsed.applicant_id));
  if (parsed.search) {
    const pattern = `%${parsed.search}%`;
    conditions.push(
      or(ilike(cases.title, pattern), ilike(cases.matter_number as any, pattern)) as SQL,
    );
  }

  const query = dbClient
    .select()
    .from(cases)
    .limit(parsed.limit)
    .offset(parsed.offset)
    .orderBy(desc(cases.created_at));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

// ---------------------------------------------------------------------------
// getCaseById
// ---------------------------------------------------------------------------
export async function getCaseById(dbClient: DbClient, id: string): Promise<Case | null> {
  const rows = await dbClient.select().from(cases).where(eq(cases.id, id)).limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// createCase
// ---------------------------------------------------------------------------
export async function createCase(
  dbClient: DbClient,
  firmId: string,
  actorId: string,
  input: CreateCaseInput,
): Promise<Case> {
  const parsed = CreateCaseSchema.parse(input);
  const matterNumber = await generateMatterNumber(dbClient, firmId);

  const newCase: NewCase = {
    firm_id: firmId,
    applicant_id: parsed.applicant_id,
    case_type: parsed.case_type,
    title: parsed.title,
    matter_number: matterNumber,
    description: parsed.description ?? null,
    assigned_to: parsed.assigned_to ?? null,
    status: parsed.status,
    metadata: parsed.metadata,
  };

  const rows = await dbClient.insert(cases).values(newCase).returning();
  const created = rows[0];

  await dbClient.insert(caseEvents).values({
    firm_id: firmId,
    case_id: created.id,
    actor_id: actorId,
    event_type: 'case_created',
    label: `Case opened: ${created.title}`,
    new_value: { case_type: created.case_type, status: created.status },
  });

  return created;
}

// ---------------------------------------------------------------------------
// updateCase
// ---------------------------------------------------------------------------
export async function updateCase(
  dbClient: DbClient,
  id: string,
  firmId: string,
  actorId: string,
  patch: UpdateCaseInput,
): Promise<Case> {
  const parsed = UpdateCaseSchema.parse(patch);

  const current = await getCaseById(dbClient, id);
  if (!current) {
    throw Object.assign(new Error('Case not found'), { statusCode: 404 });
  }

  const updates = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Partial<NewCase>;

  updates.updated_at = new Date();

  const rows = await dbClient
    .update(cases)
    .set(updates)
    .where(eq(cases.id, id))
    .returning();

  const updated = rows[0];

  // Emit events for tracked field changes
  const eventsToInsert: Omit<NewCaseEvent, 'id' | 'created_at'>[] = [];

  if (parsed.status !== undefined && parsed.status !== current.status) {
    eventsToInsert.push({
      firm_id: firmId,
      case_id: id,
      actor_id: actorId,
      event_type: 'status_changed',
      label: `Status changed to ${parsed.status}`,
      old_value: { status: current.status },
      new_value: { status: parsed.status },
    });
  }

  if (
    parsed.assigned_to !== undefined &&
    parsed.assigned_to !== current.assigned_to
  ) {
    eventsToInsert.push({
      firm_id: firmId,
      case_id: id,
      actor_id: actorId,
      event_type: 'assignment_changed',
      label: parsed.assigned_to ? 'Case reassigned' : 'Assignment removed',
      old_value: { assigned_to: current.assigned_to },
      new_value: { assigned_to: parsed.assigned_to ?? null },
    });
  }

  if (eventsToInsert.length > 0) {
    await dbClient.insert(caseEvents).values(eventsToInsert);
  }

  return updated;
}

// ---------------------------------------------------------------------------
// deleteCase  (hard delete — cascade removes case_events)
// ---------------------------------------------------------------------------
export async function deleteCase(dbClient: DbClient, id: string): Promise<void> {
  const rows = await dbClient.delete(cases).where(eq(cases.id, id)).returning();
  if (!rows[0]) {
    throw Object.assign(new Error('Case not found'), { statusCode: 404 });
  }
}

// ---------------------------------------------------------------------------
// addCaseEvent
// ---------------------------------------------------------------------------
export async function addCaseEvent(
  dbClient: DbClient,
  event: Omit<NewCaseEvent, 'id' | 'created_at'>,
): Promise<CaseEvent> {
  const rows = await dbClient.insert(caseEvents).values(event).returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// listCaseEvents
// ---------------------------------------------------------------------------
export async function listCaseEvents(
  dbClient: DbClient,
  caseId: string,
): Promise<CaseEvent[]> {
  return dbClient
    .select()
    .from(caseEvents)
    .where(eq(caseEvents.case_id, caseId))
    .orderBy(desc(caseEvents.created_at));
}

export type { CreateCaseInput, UpdateCaseInput, CaseFilters };
