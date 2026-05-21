import { pgTable, text, integer, jsonb, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { applicants } from './applicants';
import { cases } from './cases';

export const retainerAgreements = pgTable(
  'retainer_agreements',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    applicant_id: text('applicant_id')
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    template_key: text('template_key').notNull(),
    rendered_html: text('rendered_html'),
    signed_at: timestamp('signed_at', { withTimezone: true }),
    signed_ip: text('signed_ip'),
    signed_user_agent: text('signed_user_agent'),
    pdf_s3_key: text('pdf_s3_key'),
    scope: jsonb('scope').notNull().default({}),
    status: text('status').notNull().default('draft'),
    case_id: text('case_id').references(() => cases.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      'retainer_agreements_status_check',
      sql`status IN ('draft','sent','signed','withdrawn')`,
    ),
  ],
);

export type RetainerAgreement = typeof retainerAgreements.$inferSelect;
export type NewRetainerAgreement = typeof retainerAgreements.$inferInsert;
