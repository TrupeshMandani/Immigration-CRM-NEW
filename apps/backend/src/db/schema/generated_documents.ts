import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { applicants } from './applicants';

export const generatedDocuments = pgTable('generated_documents', {
  id:              text('id').primaryKey().default(sql`gen_random_uuid()`),
  firm_id:         text('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  applicant_id:    text('applicant_id').notNull().references(() => applicants.id, { onDelete: 'cascade' }),
  doc_type:        text('doc_type').notNull(),   // 'sop' | 'cover_letter' | 'checklist'
  version:         integer('version').notNull().default(1),
  s3_key:          text('s3_key').notNull(),
  file_size_bytes: integer('file_size_bytes'),
  ai_model:        text('ai_model'),
  cost_cents:      integer('cost_cents').default(0),
  created_at:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type NewGeneratedDocument = typeof generatedDocuments.$inferInsert;
