import { pgTable, text, jsonb, timestamp, check, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { applicants } from './applicants';
import { users } from './users';

export const cases = pgTable(
  'cases',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    applicant_id: text('applicant_id')
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    assigned_to: text('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    case_type: text('case_type').notNull(),
    status: text('status').notNull().default('open'),
    title: text('title').notNull(),
    matter_number: text('matter_number'),
    description: text('description'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('cases_matter_number_firm_key').on(table.firm_id, table.matter_number),
    check(
      'cases_case_type_check',
      sql`case_type IN ('express_entry','pnp','family_sponsorship','work_permit','lmia','study_permit','pgwp','visitor_visa','citizenship','refugee_asylum','hc')`,
    ),
    check(
      'cases_status_check',
      sql`status IN ('open','in_progress','submitted','approved','rejected','closed')`,
    ),
  ],
);

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
