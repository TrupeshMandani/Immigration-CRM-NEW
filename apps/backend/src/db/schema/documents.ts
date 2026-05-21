import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { applicants } from './applicants';
import { cases } from './cases';
import { users } from './users';

// One row per uploaded file. Extracted from the Mongoose Student's embedded
// requiredDocuments[].files[] arrays. S3 upload logic is wired in Prompt 10.
export const documents = pgTable('documents', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  firm_id: text('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  applicant_id: text('applicant_id')
    .notNull()
    .references(() => applicants.id, { onDelete: 'cascade' }),
  document_type: text('document_type'),
  s3_key: text('s3_key'),
  s3_bucket: text('s3_bucket'),
  mime_type: text('mime_type'),
  size_bytes: integer('size_bytes'),
  version: integer('version').default(1),
  // SHA-256 of file content — used for deduplication.
  file_hash: text('file_hash'),
  // AI verification result: { verdict, fields, model, confidence, reason }
  ai_verification: jsonb('ai_verification').default({}),
  // Nullable — AI/system uploads may not have a human uploader.
  uploaded_by: text('uploaded_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  case_id: text('case_id').references(() => cases.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
