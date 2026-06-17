import { pgTable, text, date, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const deadlines = pgTable('deadlines', {
  id:                       text('id').primaryKey().default(sql`gen_random_uuid()::text`),
  firm_id:                  text('firm_id').notNull(),
  case_id:                  text('case_id').notNull(),
  applicant_id:             text('applicant_id').notNull(),
  assigned_to:              text('assigned_to'),
  deadline_type:            text('deadline_type').notNull(),
  label:                    text('label').notNull(),
  due_date:                 date('due_date').notNull(),
  description:              text('description'),
  auto_calculated:          boolean('auto_calculated').notNull().default(false),
  days_before_notification: integer('days_before_notification').array().notNull().default([30, 14, 7]),
  acknowledged_at:          timestamp('acknowledged_at', { withTimezone: true }),
  acknowledged_by:          text('acknowledged_by'),
  metadata:                 jsonb('metadata').notNull().default({}),
  created_by:               text('created_by'),
  created_at:               timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:               timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Deadline    = typeof deadlines.$inferSelect;
export type NewDeadline = typeof deadlines.$inferInsert;
