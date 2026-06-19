-- 1. Create applicant_chat_messages table
CREATE TABLE IF NOT EXISTS applicant_chat_messages (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id       TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  applicant_id  TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  content       TEXT,
  tool_calls    TEXT,
  model         TEXT,
  cost_cents    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- 2. Index for fast per-applicant history lookups (newest first)
CREATE INDEX IF NOT EXISTS idx_acm_applicant_created
  ON applicant_chat_messages(applicant_id, created_at DESC);

--> statement-breakpoint

-- 3. Row-level security — applicant sees only own rows
ALTER TABLE applicant_chat_messages ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint

DROP POLICY IF EXISTS tenant_isolation ON applicant_chat_messages;
CREATE POLICY tenant_isolation ON applicant_chat_messages
  USING (firm_id = current_setting('app.current_firm_id', true));

--> statement-breakpoint

-- 4. Grant to app role
GRANT SELECT, INSERT, UPDATE, DELETE ON applicant_chat_messages TO icrm_app;
