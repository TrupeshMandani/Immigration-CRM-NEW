import { eq, and, isNull, isNotNull, lte, gte, desc, asc, type SQL } from 'drizzle-orm';
import { db } from '../../db/postgres';
import { deadlines, type Deadline } from '../../db/schema/deadlines';
import { caseEvents } from '../../db/schema/case_events';
import { firms } from '../../db/schema/firms';
import {
  CreateDeadlineSchema,
  UpdateDeadlineSchema,
  DeadlineFiltersSchema,
  DEADLINE_TYPE_LABELS,
  DEFAULT_NOTIFICATIONS,
  type CreateDeadlineInput,
  type UpdateDeadlineInput,
  type DeadlineFilters,
  type DeadlineType,
} from '@icrm/shared-types/deadlines';

type DbClient = typeof db;

// ─── Urgency ──────────────────────────────────────────────────────────────────

export type DeadlineUrgency = 'overdue' | 'critical' | 'warning' | 'upcoming' | 'future';

/** Days between two YYYY-MM-DD strings (positive = due is in the future). */
function daysUntilDate(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function computeUrgency(dueDateStr: string): DeadlineUrgency {
  const d = daysUntilDate(dueDateStr);
  if (d < 0)  return 'overdue';
  if (d < 7)  return 'critical';
  if (d < 30) return 'warning';
  if (d < 90) return 'upcoming';
  return 'future';
}

// ─── Format ───────────────────────────────────────────────────────────────────

export interface FormattedDeadline extends Deadline {
  urgency: DeadlineUrgency;
  days_until: number;
}

function formatDeadline(row: Deadline): FormattedDeadline {
  const days_until = daysUntilDate(row.due_date);
  return { ...row, urgency: computeUrgency(row.due_date), days_until };
}

// ─── Urgency → date window helper ─────────────────────────────────────────────

function urgencyDateWindow(urgency: string): { from?: string; to?: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const addDays = (base: Date, n: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  switch (urgency) {
    case 'overdue':  return { to: addDays(today, -1) };
    case 'critical': return { from: todayStr,            to: addDays(today, 6)  };
    case 'warning':  return { from: addDays(today, 7),   to: addDays(today, 29) };
    case 'upcoming': return { from: addDays(today, 30),  to: addDays(today, 89) };
    case 'future':   return { from: addDays(today, 90) };
    default:         return {};
  }
}

// ─── listDeadlines ────────────────────────────────────────────────────────────

export async function listDeadlines(
  dbClient: DbClient,
  rawFilters?: Record<string, unknown>,
): Promise<FormattedDeadline[]> {
  const filters = DeadlineFiltersSchema.parse(rawFilters ?? {});
  const conditions: SQL[] = [];

  if (filters.case_id)        conditions.push(eq(deadlines.case_id, filters.case_id));
  if (filters.applicant_id)   conditions.push(eq(deadlines.applicant_id, filters.applicant_id));
  if (filters.assigned_to)    conditions.push(eq(deadlines.assigned_to, filters.assigned_to));
  if (filters.deadline_type)  conditions.push(eq(deadlines.deadline_type, filters.deadline_type));
  if (filters.unacknowledged) conditions.push(isNull(deadlines.acknowledged_at));

  // Date range from urgency tier (takes precedence if also set)
  if (filters.urgency) {
    const window = urgencyDateWindow(filters.urgency);
    if (window.from) conditions.push(gte(deadlines.due_date, window.from));
    if (window.to)   conditions.push(lte(deadlines.due_date, window.to));
  } else {
    if (filters.from_date) conditions.push(gte(deadlines.due_date, filters.from_date));
    if (filters.to_date)   conditions.push(lte(deadlines.due_date, filters.to_date));
  }

  const rows = await dbClient
    .select()
    .from(deadlines)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(deadlines.due_date), desc(deadlines.created_at))
    .limit(filters.limit)
    .offset(filters.offset);

  return rows.map(formatDeadline);
}

// ─── getDeadlineById ──────────────────────────────────────────────────────────

export async function getDeadlineById(
  dbClient: DbClient,
  id: string,
): Promise<FormattedDeadline | null> {
  const [row] = await dbClient
    .select()
    .from(deadlines)
    .where(eq(deadlines.id, id))
    .limit(1);
  return row ? formatDeadline(row) : null;
}

// ─── createDeadline ───────────────────────────────────────────────────────────

export async function createDeadline(
  dbClient: DbClient,
  firmId: string,
  actorId: string,
  rawInput: unknown,
): Promise<FormattedDeadline> {
  const input = CreateDeadlineSchema.parse(rawInput);
  const type = input.deadline_type as DeadlineType;

  const label = input.label ?? DEADLINE_TYPE_LABELS[type];
  const days_before_notification =
    input.days_before_notification ?? DEFAULT_NOTIFICATIONS[type];

  const [row] = await dbClient
    .insert(deadlines)
    .values({
      firm_id:                  firmId,
      case_id:                  input.case_id,
      applicant_id:             input.applicant_id,
      assigned_to:              input.assigned_to ?? null,
      deadline_type:            type,
      label,
      due_date:                 input.due_date,
      description:              input.description ?? null,
      days_before_notification,
      metadata:                 (input.metadata ?? {}) as Record<string, unknown>,
      created_by:               actorId,
    })
    .returning();

  // Timeline event (fire-and-forget; non-fatal)
  dbClient
    .insert(caseEvents)
    .values({
      firm_id:    firmId,
      case_id:    input.case_id,
      actor_id:   actorId,
      event_type: 'deadline_added',
      label:      `Deadline added: ${label} (${input.due_date})`,
    })
    .catch(() => {});

  return formatDeadline(row);
}

// ─── updateDeadline ───────────────────────────────────────────────────────────

export async function updateDeadline(
  dbClient: DbClient,
  id: string,
  firmId: string,
  actorId: string,
  rawPatch: unknown,
): Promise<FormattedDeadline> {
  const patch = UpdateDeadlineSchema.parse(rawPatch);

  const [current] = await dbClient
    .select()
    .from(deadlines)
    .where(eq(deadlines.id, id))
    .limit(1);

  if (!current) throw Object.assign(new Error('Deadline not found'), { statusCode: 404 });

  const updates: Partial<typeof deadlines.$inferInsert> & { updated_at: Date } = {
    updated_at: new Date(),
  };

  if (patch.deadline_type !== undefined)            updates.deadline_type = patch.deadline_type;
  if (patch.label !== undefined)                    updates.label = patch.label;
  if (patch.due_date !== undefined)                 updates.due_date = patch.due_date;
  if (patch.description !== undefined)              updates.description = patch.description ?? null;
  if (patch.assigned_to !== undefined)              updates.assigned_to = patch.assigned_to ?? null;
  if (patch.days_before_notification !== undefined) updates.days_before_notification = patch.days_before_notification;
  if (patch.metadata !== undefined)                 updates.metadata = patch.metadata as Record<string, unknown>;
  if (patch.acknowledged_at !== undefined) {
    updates.acknowledged_at = patch.acknowledged_at ? new Date(patch.acknowledged_at) : null;
  }

  const [row] = await dbClient
    .update(deadlines)
    .set(updates)
    .where(eq(deadlines.id, id))
    .returning();

  if (!row) throw Object.assign(new Error('Deadline not found'), { statusCode: 404 });

  // Timeline event
  const eventType = patch.acknowledged_at ? 'deadline_acknowledged' : 'deadline_updated';
  const eventLabel = patch.acknowledged_at
    ? `${row.label} acknowledged`
    : `Deadline updated: ${row.label}`;

  dbClient
    .insert(caseEvents)
    .values({
      firm_id:    firmId,
      case_id:    row.case_id,
      actor_id:   actorId,
      event_type: eventType,
      label:      eventLabel,
    })
    .catch(() => {});

  return formatDeadline(row);
}

// ─── deleteDeadline ───────────────────────────────────────────────────────────

export async function deleteDeadline(dbClient: DbClient, id: string): Promise<void> {
  const result = await dbClient
    .delete(deadlines)
    .where(eq(deadlines.id, id))
    .returning({ id: deadlines.id });
  if (!result.length) throw Object.assign(new Error('Deadline not found'), { statusCode: 404 });
}

// ─── acknowledgeDeadline ──────────────────────────────────────────────────────

export async function acknowledgeDeadline(
  dbClient: DbClient,
  id: string,
  firmId: string,
  actorId: string,
): Promise<FormattedDeadline> {
  const [row] = await dbClient
    .update(deadlines)
    .set({
      acknowledged_at: new Date(),
      acknowledged_by: actorId,
      updated_at:      new Date(),
    })
    .where(eq(deadlines.id, id))
    .returning();

  if (!row) throw Object.assign(new Error('Deadline not found'), { statusCode: 404 });

  dbClient
    .insert(caseEvents)
    .values({
      firm_id:    firmId,
      case_id:    row.case_id,
      actor_id:   actorId,
      event_type: 'deadline_acknowledged',
      label:      `${row.label} acknowledged`,
    })
    .catch(() => {});

  return formatDeadline(row);
}

// ─── getDeadlinesForWorker ────────────────────────────────────────────────────

/**
 * Called by the BullMQ worker — runs as superuser so it bypasses RLS and sees
 * all firms.  Fetches unacknowledged deadlines due within 90 days (+ overdue).
 */
export async function getDeadlinesForWorker(): Promise<Deadline[]> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in90 = new Date(today);
  in90.setDate(in90.getDate() + 90);
  const in90Str = `${in90.getFullYear()}-${pad(in90.getMonth() + 1)}-${pad(in90.getDate())}`;

  return db
    .select()
    .from(deadlines)
    .where(and(isNull(deadlines.acknowledged_at), lte(deadlines.due_date, in90Str)));
}

// ─── generateIcalFeed ─────────────────────────────────────────────────────────

export async function generateIcalFeed(
  dbClient: DbClient,
  firmId: string,
): Promise<string> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ago30 = new Date(today);
  ago30.setDate(ago30.getDate() - 30);
  const ago30Str = `${ago30.getFullYear()}-${pad(ago30.getMonth() + 1)}-${pad(ago30.getDate())}`;

  const rows = await dbClient
    .select()
    .from(deadlines)
    .where(
      and(
        isNull(deadlines.acknowledged_at),
        gte(deadlines.due_date, ago30Str),
      ),
    )
    .orderBy(asc(deadlines.due_date));

  // Dynamically import ical-generator (CJS default export)
  const { default: ical } = await import('ical-generator');
  const cal = ical({ name: 'Immigration CRM Deadlines', prodId: '-//Immigration CRM//NONSGML v1.0//EN' });

  for (const d of rows) {
    const urgency = computeUrgency(d.due_date);
    const dueDate = new Date(d.due_date + 'T00:00:00');
    const nextDay = new Date(dueDate);
    nextDay.setDate(nextDay.getDate() + 1);

    cal.createEvent({
      start:       dueDate,
      end:         nextDay,
      allDay:      true,
      summary:     `[${urgency.toUpperCase()}] ${d.label}`,
      description: [
        `Type: ${DEADLINE_TYPE_LABELS[d.deadline_type as DeadlineType] ?? d.deadline_type}`,
        `Due: ${d.due_date}`,
        d.description ?? '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  return cal.toString();
}

// ─── getFirmByIcalToken ───────────────────────────────────────────────────────

export async function getFirmByIcalToken(token: string) {
  const [firm] = await db
    .select({ id: firms.id })
    .from(firms)
    .where(eq(firms.ical_token, token))
    .limit(1);
  return firm ?? null;
}
