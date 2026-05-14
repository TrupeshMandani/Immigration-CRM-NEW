import { pgTable, text, boolean, jsonb, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { students } from './students';
import { documents } from './documents';
import { users } from './users';

export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    student_id: text('student_id').references(() => students.id, {
      onDelete: 'set null',
    }),
    document_id: text('document_id').references(() => documents.id, {
      onDelete: 'set null',
    }),
    // discriminator: general | ai_verification | deadline | reminder
    task_type: text('task_type').notNull().default('general'),
    title: text('title').notNull(),
    description: text('description'),
    // open | in_progress | done | dismissed
    status: text('status').notNull().default('open'),
    assigned_to: text('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    created_by: text('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    ai_generated: boolean('ai_generated').default(false),
    due_at: timestamp('due_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    // ai_verification subtype: append-only history of each AI verdict
    verification_history: jsonb('verification_history').default(
      sql`'[]'::jsonb`,
    ),
    // Flexible bag: priority, verificationStatus, studentName, fileId, etc.
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    // Notification controls (kept for Prompt 13 — do not remove)
    is_read: boolean('is_read').default(false),
    notification_muted: boolean('notification_muted').default(false),
    notification_deleted: boolean('notification_deleted').default(false),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      'tasks_type_check',
      sql`task_type IN ('general', 'ai_verification', 'deadline', 'reminder')`,
    ),
    check(
      'tasks_status_check',
      sql`status IN ('open', 'in_progress', 'done', 'dismissed')`,
    ),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
