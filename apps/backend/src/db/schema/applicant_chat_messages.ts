import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { applicants } from './applicants';

export const applicantChatMessages = pgTable('applicant_chat_messages', {
  id:           text('id').primaryKey().default(sql`gen_random_uuid()`),
  firm_id:      text('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  applicant_id: text('applicant_id').notNull().references(() => applicants.id, { onDelete: 'cascade' }),
  // 'user' | 'assistant'
  role:         text('role').notNull(),
  content:      text('content'),
  // JSON string — assistant tool calls if model invoked tools
  tool_calls:   text('tool_calls'),
  model:        text('model'),
  cost_cents:   integer('cost_cents').default(0),
  created_at:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ApplicantChatMessage    = typeof applicantChatMessages.$inferSelect;
export type NewApplicantChatMessage = typeof applicantChatMessages.$inferInsert;
