import { pgTable, text, jsonb, timestamp, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { users } from './users';

export const applicants = pgTable(
  'applicants',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('registered'),
    first_name: text('first_name'),
    last_name: text('last_name'),
    email: text('email').notNull(),
    profile_data: jsonb('profile_data').default({}),
    ai_key: text('ai_key').notNull().unique(),
    assigned_to: text('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    stage: text('stage').notNull().default('lead'),
    state_data: jsonb('state_data').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('applicants_firm_email_unique').on(table.firm_id, table.email),
    check(
      'applicants_status_check',
      sql`status IN ('pending','registered','active','closed')`,
    ),
    check(
      'applicants_stage_check',
      sql`stage IN ('lead','study_permit','pgwp','pr','citizenship')`,
    ),
  ],
);

export type Applicant = typeof applicants.$inferSelect;
export type NewApplicant = typeof applicants.$inferInsert;
