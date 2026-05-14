import { pgTable, text, integer, jsonb, timestamp, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';

export const aiJobs = pgTable('ai_jobs', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  firm_id: text('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  // doc_verify | field_extract | recommendation | chat | fraud_screen
  job_type: text('job_type').notNull(),
  // document | student | case
  related_entity_type: text('related_entity_type'),
  related_entity_id: text('related_entity_id'),
  model: text('model'),
  // anthropic | openai
  provider: text('provider'),
  prompt_tokens: integer('prompt_tokens'),
  completion_tokens: integer('completion_tokens'),
  cost_cents: numeric('cost_cents', { precision: 10, scale: 4 }),
  latency_ms: integer('latency_ms'),
  // pending | success | error
  status: text('status').notNull().default('pending'),
  // PII-redacted summary of input (no raw text, only metadata)
  input_summary: jsonb('input_summary'),
  output: jsonb('output'),
  error_message: text('error_message'),
  // correct | incorrect | null — powers the data flywheel
  consultant_feedback: text('consultant_feedback'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type AiJob = typeof aiJobs.$inferSelect;
export type NewAiJob = typeof aiJobs.$inferInsert;
