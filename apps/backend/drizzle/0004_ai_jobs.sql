-- ai_jobs: ledger of every AI call made by the system.
-- Idempotent — safe to re-run.
CREATE TABLE IF NOT EXISTS ai_jobs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id   TEXT,
  model           TEXT,
  provider        TEXT,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  cost_cents      NUMERIC(10, 4),
  latency_ms      INTEGER,
  status          TEXT NOT NULL DEFAULT 'pending',
  input_summary   JSONB,
  output          JSONB,
  error_message   TEXT,
  consultant_feedback TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_jobs TO icrm_app;
--> statement-breakpoint
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE ai_jobs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON ai_jobs;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON ai_jobs
  USING (firm_id = current_setting('app.current_firm_id', true));
