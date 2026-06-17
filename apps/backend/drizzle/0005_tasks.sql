-- tasks: Postgres-backed task ledger replacing the Mongoose Task model.
-- Idempotent — safe to re-run.
CREATE TABLE IF NOT EXISTS tasks (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id              TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  applicant_id         TEXT REFERENCES applicants(id) ON DELETE SET NULL,
  document_id          TEXT REFERENCES documents(id) ON DELETE SET NULL,
  task_type            TEXT NOT NULL DEFAULT 'general'
                         CHECK (task_type IN ('general', 'ai_verification', 'deadline', 'reminder')),
  title                TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'in_progress', 'done', 'dismissed')),
  assigned_to          TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  ai_generated         BOOLEAN DEFAULT FALSE,
  due_at               TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  verification_history JSONB DEFAULT '[]'::JSONB,
  metadata             JSONB DEFAULT '{}'::JSONB,
  is_read              BOOLEAN DEFAULT FALSE,
  notification_muted   BOOLEAN DEFAULT FALSE,
  notification_deleted BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_firm_status_idx ON tasks (firm_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_firm_type_idx   ON tasks (firm_id, task_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_document_idx    ON tasks (document_id) WHERE document_id IS NOT NULL;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO icrm_app;
--> statement-breakpoint
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON tasks;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON tasks
  USING (firm_id = current_setting('app.current_firm_id', true));
