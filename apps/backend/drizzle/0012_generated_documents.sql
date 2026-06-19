CREATE TABLE IF NOT EXISTS generated_documents (
  id              text PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         text NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  applicant_id    text NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  doc_type        text NOT NULL,
  version         integer NOT NULL DEFAULT 1,
  s3_key          text NOT NULL,
  file_size_bytes integer,
  ai_model        text,
  cost_cents      integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gd_applicant_type ON generated_documents(applicant_id, doc_type, version DESC);
--> statement-breakpoint
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY IF NOT EXISTS "firm_admin_generated_docs" ON generated_documents
  USING (firm_id = current_setting('app.current_firm_id', true));
