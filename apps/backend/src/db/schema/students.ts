import { pgTable, text, boolean, jsonb, timestamp, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { users } from './users';

export const students = pgTable(
  'students',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('registered'),
    first_name: text('first_name'),
    last_name: text('last_name'),
    email: text('email').notNull(),
    // Flexible JSONB blob — mirrors the Mongoose profile (Mixed) field.
    profile_data: jsonb('profile_data').default({}),
    // Unique key used by the MCP agent and AI extraction pipeline.
    // Preserved verbatim from the existing Mongoose aiKey field during ETL.
    ai_key: text('ai_key').notNull().unique(),
    // Nullable FK — a student may not yet be assigned to a consultant.
    assigned_to: text('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    stage: text('stage').notNull().default('lead'),
    // Catch-all JSONB for immigration-stage-specific state (visa numbers, etc.)
    state_data: jsonb('state_data').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('students_firm_email_unique').on(table.firm_id, table.email),
    check(
      'students_status_check',
      sql`status IN ('pending','registered','active','closed')`,
    ),
    check(
      'students_stage_check',
      sql`stage IN ('lead','study_permit','pgwp','pr','citizenship')`,
    ),
  ],
);

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
