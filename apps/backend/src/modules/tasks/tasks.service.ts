import { eq, inArray, and, desc, SQL, sql as drizzleSql } from 'drizzle-orm';
import { db, withFirmContext } from '../../db/postgres';
import { tasks, type Task, type NewTask } from '../../db/schema/tasks';
import type { VerificationResult } from '../ai/verification.service';

// Lazy import (.js extension required by NodeNext resolution).
// CJS module caching makes circular deps safe at runtime — socket is always
// initialized before any task mutations occur.
async function getSocketEmitters() {
  const socket = await import('../../socket/index.js');
  return { emitToFirm: socket.emitToFirm };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DbClient = typeof db;

export type TaskType = 'general' | 'ai_verification' | 'deadline' | 'reminder';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'dismissed';

/** Metadata bag stored in tasks.metadata JSONB. */
export interface TaskMetadata {
  priority?: 'low' | 'medium' | 'high';
  // Verification snapshot (latest — the full history is in verification_history)
  verificationStatus?: string;
  verificationConfidence?: number;
  verificationDetectedType?: string;
  verificationReason?: string;
  // Applicant context fields surfaced on tasks for the frontend
  applicantName?: string;
  applicantAiKey?: string;
  documentField?: string;
  documentSlug?: string;
  fileId?: string;
  fileName?: string;
  uploadTimestamp?: string;
  // AI job traceability
  aiJobId?: string | null;
  // Extra details (s3Key, bucket, mimeType for ai_verification)
  [key: string]: unknown;
}

/** Verification history entry appended on each AI verdict. */
export interface VerificationHistoryEntry {
  status: string;
  confidence: number;
  detectedType: string;
  reason: string;
  recordedAt: string;
}

/**
 * Response shape — mirrors the old Mongoose formatTask() output so frontend
 * task views continue to work.  Internal status/type values are exposed as-is.
 */
export interface TaskResponse {
  id: string;
  /** Maps 'ai_verification' → 'ai-verification' for backward compat */
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  applicantId: string | null;
  applicantName: string | null;
  applicantAiKey: string | null;
  documentId: string | null;
  documentField: string | null;
  documentSlug: string | null;
  fileId: string | null;
  fileName: string | null;
  uploadTimestamp: string | null;
  verificationStatus: string | null;
  verificationConfidence: number | null;
  verificationDetectedType: string | null;
  verificationReason: string | null;
  verificationHistory: VerificationHistoryEntry[];
  isRead: boolean;
  resolvedAt: string | null;
  notificationMuted: boolean;
  notificationDeleted: boolean;
  aiGenerated: boolean;
  dueAt: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  task_type?: TaskType;
  title: string;
  description?: string;
  applicant_id?: string;
  document_id?: string;
  assigned_to?: string;
  created_by?: string;
  due_at?: Date;
  metadata?: TaskMetadata;
}

export interface UpdateTaskInput {
  description?: string;
  status?: TaskStatus;
  is_read?: boolean;
  notification_muted?: boolean;
  notification_deleted?: boolean;
  assigned_to?: string | null;
  due_at?: Date | null;
  metadata?: Partial<TaskMetadata>;
}

// ─── formatTask ───────────────────────────────────────────────────────────────

/** Pre-applicant-rename prefix still present in some production task.metadata JSONB rows. */
const LEGACY_TASK_META_PREFIX = String.fromCharCode(115, 116, 117, 100, 101, 110, 116);

/** Read a string from task metadata, checking the current key then a legacy alias. */
function metaString(
  meta: TaskMetadata,
  primaryKey: 'applicantName' | 'applicantAiKey',
  legacySuffix: 'Name' | 'AiKey',
): string | null {
  const bag = meta as Record<string, unknown>;
  const primary = bag[primaryKey];
  if (typeof primary === 'string' && primary) return primary;
  const legacy = bag[`${LEGACY_TASK_META_PREFIX}${legacySuffix}`];
  if (typeof legacy === 'string' && legacy) return legacy;
  return null;
}

/** Converts a Postgres Task row into the legacy-compatible API response. */
export function formatTask(row: Task): TaskResponse {
  const meta = (row.metadata ?? {}) as TaskMetadata;
  const history = (row.verification_history ?? []) as VerificationHistoryEntry[];

  // Map underscore type to hyphen for backward compat with frontend
  const type = row.task_type === 'ai_verification' ? 'ai-verification' : row.task_type;

  const applicantName = metaString(meta, 'applicantName', 'Name');
  const applicantAiKey = metaString(meta, 'applicantAiKey', 'AiKey');
  const applicantId = row.applicant_id ?? null;

  return {
    id: row.id,
    type,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: meta.priority ?? 'medium',
    applicantId,
    applicantName,
    applicantAiKey,
    documentId: row.document_id ?? null,
    documentField: meta.documentField ?? null,
    documentSlug: meta.documentSlug ?? null,
    fileId: meta.fileId ?? null,
    fileName: meta.fileName ?? null,
    uploadTimestamp: meta.uploadTimestamp ?? null,
    verificationStatus: meta.verificationStatus ?? null,
    verificationConfidence: meta.verificationConfidence ?? null,
    verificationDetectedType: meta.verificationDetectedType ?? null,
    verificationReason: meta.verificationReason ?? null,
    verificationHistory: history,
    isRead: row.is_read ?? false,
    resolvedAt: row.completed_at?.toISOString() ?? null,
    notificationMuted: row.notification_muted ?? false,
    notificationDeleted: row.notification_deleted ?? false,
    aiGenerated: row.ai_generated ?? false,
    dueAt: row.due_at?.toISOString() ?? null,
    assignedTo: row.assigned_to ?? null,
    createdBy: row.created_by ?? null,
    metadata: meta as Record<string, unknown>,
    createdAt: row.created_at?.toISOString() ?? '',
    updatedAt: row.updated_at?.toISOString() ?? '',
  };
}

// ─── listTasks ────────────────────────────────────────────────────────────────

export interface ListTasksFilter {
  type?: string;
  status?: string;
  scope?: string;
  limit?: number;
  page?: number;
}

export async function listTasks(
  dbClient: DbClient,
  filters: ListTasksFilter = {},
): Promise<{ tasks: TaskResponse[]; meta: Record<string, unknown> }> {
  const { type, status, scope, limit: rawLimit = 25, page: rawPage = 1 } = filters;

  const perPage = Math.min(Math.max(Number(rawLimit) || 25, 1), 200);
  const currentPage = Math.max(Number(rawPage) || 1, 1);
  const offset = (currentPage - 1) * perPage;

  const conditions: SQL[] = [];

  if (scope === 'notifications') {
    conditions.push(eq(tasks.status, 'open'));
    conditions.push(eq(tasks.notification_muted, false));
    conditions.push(eq(tasks.notification_deleted, false));
    if (type && type !== 'all') {
      const dbType = type === 'ai-verification' ? 'ai_verification' : type;
      conditions.push(eq(tasks.task_type, dbType));
    }

    const rows = await dbClient
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.created_at))
      .limit(perPage);

    const [{ unread }] = await dbClient
      .select({ unread: drizzleSql<number>`count(*)::int` })
      .from(tasks)
      .where(and(...conditions, eq(tasks.is_read, false)));

    return {
      tasks: rows.map(formatTask),
      meta: { total: rows.length, unread: unread ?? 0 },
    };
  }

  if (type && type !== 'all') {
    const dbType = type === 'ai-verification' ? 'ai_verification' : type;
    conditions.push(eq(tasks.task_type, dbType));
  }
  if (status && status !== 'all') {
    conditions.push(eq(tasks.status, status as TaskStatus));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    dbClient
      .select()
      .from(tasks)
      .where(where)
      .orderBy(desc(tasks.created_at))
      .offset(offset)
      .limit(perPage),
    dbClient
      .select({ total: drizzleSql<number>`count(*)::int` })
      .from(tasks)
      .where(where),
  ]);

  return {
    tasks: rows.map(formatTask),
    meta: {
      total: total ?? 0,
      page: currentPage,
      limit: perPage,
      pages: Math.ceil((total ?? 0) / perPage) || 1,
    },
  };
}

// ─── createTask ───────────────────────────────────────────────────────────────

export async function createTask(
  dbClient: DbClient,
  firmId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const [row] = await dbClient
    .insert(tasks)
    .values({
      firm_id: firmId,
      applicant_id: input.applicant_id ?? null,
      document_id: input.document_id ?? null,
      task_type: input.task_type ?? 'general',
      title: input.title,
      description: input.description ?? null,
      assigned_to: input.assigned_to ?? null,
      created_by: input.created_by ?? null,
      due_at: input.due_at ?? null,
      metadata: (input.metadata ?? {}) as Record<string, unknown>,
    })
    .returning();

  getSocketEmitters()
    .then(({ emitToFirm }) => emitToFirm(firmId, 'task:created', formatTask(row)))
    .catch(() => {});

  return row;
}

// ─── createAIVerificationTask ─────────────────────────────────────────────────

/**
 * Called by the AI worker after a doc_verify job completes with a
 * 'pending' or 'failed' verdict.  Upserts an ai_verification task so
 * the consultant knows to review the document.
 *
 * @param documentId  Postgres documents.id
 * @param verdict     Full VerificationResult from verification.service
 * @param aiJobId     ai_jobs.id for traceability (nullable)
 * @param context     firmId + applicantId (both available in the worker)
 */
export async function createAIVerificationTask(
  documentId: string,
  verdict: VerificationResult,
  aiJobId: string | null,
  context: { firmId: string; applicantId?: string | null },
): Promise<Task | null> {
  const { firmId } = context;
  const applicantId = context.applicantId ?? null;

  const historyEntry: VerificationHistoryEntry = {
    status: verdict.status,
    confidence: verdict.confidence,
    detectedType: verdict.detectedType,
    reason: verdict.reason,
    recordedAt: new Date().toISOString(),
  };

  const meta: TaskMetadata = {
    verificationStatus: verdict.status,
    verificationConfidence: verdict.confidence,
    verificationDetectedType: verdict.detectedType,
    verificationReason: verdict.reason,
    priority: verdict.status === 'failed' ? 'high' : 'medium',
    aiJobId,
  };

  return withFirmContext(firmId, async (tx) => {
    // Upsert: if an open task for this document already exists, update it.
    const [existing] = await tx
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.document_id, documentId),
          eq(tasks.task_type, 'ai_verification'),
          inArray(tasks.status, ['open', 'in_progress']),
        ),
      )
      .limit(1);

    if (existing) {
      const prevHistory = (existing.verification_history ?? []) as VerificationHistoryEntry[];
      const [updated] = await tx
        .update(tasks)
        .set({
          status: 'open',
          metadata: meta as Record<string, unknown>,
          verification_history: [...prevHistory, historyEntry],
          is_read: false,
          updated_at: new Date(),
        })
        .where(eq(tasks.id, existing.id))
        .returning();
      return updated;
    }

    // New task
    const [created] = await tx
      .insert(tasks)
      .values({
        firm_id: firmId,
        applicant_id: applicantId ?? null,
        document_id: documentId,
        task_type: 'ai_verification',
        title: `Document needs manual verification`,
        description: verdict.reason || 'AI could not verify the document.',
        status: 'open',
        ai_generated: true,
        metadata: meta as Record<string, unknown>,
        verification_history: [historyEntry],
        is_read: false,
      })
      .returning();

    getSocketEmitters()
      .then(({ emitToFirm }) => emitToFirm(firmId, 'task:created', formatTask(created)))
      .catch(() => {});

    return created;
  });
}

// ─── completeTask ─────────────────────────────────────────────────────────────

export async function completeTask(
  dbClient: DbClient,
  id: string,
  completedByUserId: string,
): Promise<Task> {
  const [row] = await dbClient
    .update(tasks)
    .set({
      status: 'done',
      completed_at: new Date(),
      assigned_to: completedByUserId,
      is_read: false,
      updated_at: new Date(),
    })
    .where(eq(tasks.id, id))
    .returning();
  if (!row) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  getSocketEmitters()
    .then(({ emitToFirm }) => emitToFirm(row.firm_id, 'task:updated', formatTask(row)))
    .catch(() => {});
  return row;
}

// ─── reassignTask ─────────────────────────────────────────────────────────────

export async function reassignTask(
  dbClient: DbClient,
  id: string,
  newUserId: string,
): Promise<Task> {
  const [row] = await dbClient
    .update(tasks)
    .set({ assigned_to: newUserId, updated_at: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  if (!row) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  getSocketEmitters()
    .then(({ emitToFirm }) => emitToFirm(row.firm_id, 'task:updated', formatTask(row)))
    .catch(() => {});
  return row;
}

// ─── updateTask ───────────────────────────────────────────────────────────────

export async function updateTask(
  dbClient: DbClient,
  id: string,
  payload: UpdateTaskInput,
): Promise<Task> {
  const updates: Partial<NewTask> & { updated_at: Date } = { updated_at: new Date() };

  if (typeof payload.description === 'string') updates.description = payload.description.trim();
  if (payload.status) updates.status = payload.status;
  if (typeof payload.is_read === 'boolean') updates.is_read = payload.is_read;
  if (typeof payload.notification_muted === 'boolean') updates.notification_muted = payload.notification_muted;
  if (typeof payload.notification_deleted === 'boolean') updates.notification_deleted = payload.notification_deleted;
  if (payload.assigned_to !== undefined) updates.assigned_to = payload.assigned_to ?? undefined;
  if (payload.due_at !== undefined) updates.due_at = payload.due_at ?? undefined;

  if (payload.status === 'done') {
    updates.completed_at = new Date();
  }

  if (payload.metadata) {
    // Merge into existing metadata
    const [current] = await dbClient
      .select({ metadata: tasks.metadata })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!current) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
    updates.metadata = {
      ...((current.metadata ?? {}) as Record<string, unknown>),
      ...(payload.metadata as Record<string, unknown>),
    };
  }

  const [row] = await dbClient
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();

  if (!row) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
  getSocketEmitters()
    .then(({ emitToFirm }) => emitToFirm(row.firm_id, 'task:updated', formatTask(row)))
    .catch(() => {});
  return row;
}

// ─── deleteTask ───────────────────────────────────────────────────────────────

export async function deleteTask(dbClient: DbClient, id: string): Promise<void> {
  const result = await dbClient
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning({ id: tasks.id });
  if (!result.length) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
}

// ─── markTasksRead ────────────────────────────────────────────────────────────

export async function markTasksRead(
  dbClient: DbClient,
  taskIds: string[],
): Promise<{ updated: number }> {
  if (!taskIds.length) return { updated: 0 };
  const result = await dbClient
    .update(tasks)
    .set({ is_read: true, updated_at: new Date() })
    .where(inArray(tasks.id, taskIds))
    .returning({ id: tasks.id });
  return { updated: result.length };
}
