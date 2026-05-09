import { eq, ilike, or, and, type SQL } from 'drizzle-orm';
import { db } from '../../db/postgres';
import { students, type Student, type NewStudent } from '../../db/schema/students';
import {
  CreateStudentSchema,
  UpdateStudentSchema,
  StudentFiltersSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
  type StudentFilters,
} from '@icrm/shared-types/students';

type DbClient = typeof db;

// ---------------------------------------------------------------------------
// ai_key generator — URL-safe, human-readable, unique enough for dev.
// Follows the existing pattern from the Mongoose model.
// ---------------------------------------------------------------------------
function generateAiKey(email: string): string {
  const prefix = email.split('@')[0]?.replace(/[^a-z0-9]/gi, '').slice(0, 12) ?? 'student';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${suffix}`;
}

// ---------------------------------------------------------------------------
// listStudents
// ---------------------------------------------------------------------------
export async function listStudents(
  dbClient: DbClient,
  filters?: StudentFilters,
): Promise<Student[]> {
  const parsed = StudentFiltersSchema.parse(filters ?? {});

  const conditions: SQL[] = [];

  if (parsed.status) {
    conditions.push(eq(students.status, parsed.status));
  }
  if (parsed.stage) {
    conditions.push(eq(students.stage, parsed.stage));
  }
  if (parsed.search) {
    const pattern = `%${parsed.search}%`;
    conditions.push(
      or(
        ilike(students.email, pattern),
        ilike(students.first_name, pattern),
        ilike(students.last_name, pattern),
      ) as SQL,
    );
  }

  const query = dbClient
    .select()
    .from(students)
    .limit(parsed.limit)
    .offset(parsed.offset)
    .orderBy(students.created_at);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

// ---------------------------------------------------------------------------
// getStudentById
// ---------------------------------------------------------------------------
export async function getStudentById(
  dbClient: DbClient,
  id: string,
): Promise<Student | null> {
  const rows = await dbClient
    .select()
    .from(students)
    .where(eq(students.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// getStudentByAiKey — used by MCP agent lookup
// ---------------------------------------------------------------------------
export async function getStudentByAiKey(
  dbClient: DbClient,
  aiKey: string,
): Promise<Student | null> {
  const rows = await dbClient
    .select()
    .from(students)
    .where(eq(students.ai_key, aiKey))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// createStudent
// ---------------------------------------------------------------------------
export async function createStudent(
  dbClient: DbClient,
  firmId: string,
  input: CreateStudentInput,
): Promise<Student> {
  const parsed = CreateStudentSchema.parse(input);

  const aiKey = parsed.ai_key ?? generateAiKey(parsed.email);

  const newStudent: NewStudent = {
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

  const rows = await dbClient.insert(students).values(newStudent).returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// updateStudent
// ---------------------------------------------------------------------------
export async function updateStudent(
  dbClient: DbClient,
  id: string,
  patch: UpdateStudentInput,
): Promise<Student> {
  const parsed = UpdateStudentSchema.parse(patch);

  // Remove undefined keys so we only SET what was actually provided.
  const updates = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Partial<NewStudent>;

  updates.updated_at = new Date();

  const rows = await dbClient
    .update(students)
    .set(updates)
    .where(eq(students.id, id))
    .returning();

  if (!rows[0]) {
    throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  }
  return rows[0];
}

// ---------------------------------------------------------------------------
// updateStudentStage
// ---------------------------------------------------------------------------
export async function updateStudentStage(
  dbClient: DbClient,
  id: string,
  newStage: string,
): Promise<Student> {
  const { stage } = UpdateStudentSchema.pick({ stage: true }).parse({ stage: newStage });
  return updateStudent(dbClient, id, { stage });
}

// ---------------------------------------------------------------------------
// deleteStudent  (soft — sets status = 'closed')
// ---------------------------------------------------------------------------
export async function deleteStudent(
  dbClient: DbClient,
  id: string,
): Promise<Student> {
  const rows = await dbClient
    .update(students)
    .set({ status: 'closed', updated_at: new Date() })
    .where(eq(students.id, id))
    .returning();

  if (!rows[0]) {
    throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  }
  return rows[0];
}

// ---------------------------------------------------------------------------
// Re-export types so route handlers can import from one place
// ---------------------------------------------------------------------------
export type { CreateStudentInput, UpdateStudentInput, StudentFilters };
