-- Sprint 1: Case / Matter Management
-- Idempotent — safe to re-run.

-- ─── 1. Expand case_type check constraint to full IRCC set ────────────────────
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_case_type_check;
--> statement-breakpoint
ALTER TABLE cases ADD CONSTRAINT cases_case_type_check
  CHECK (case_type IN (
    'express_entry','pnp','family_sponsorship','work_permit','lmia',
    'study_permit','pgwp','visitor_visa','citizenship','refugee_asylum','hc'
  ));

-- ─── 2. Add matter_number column ─────────────────────────────────────────────
ALTER TABLE cases ADD COLUMN IF NOT EXISTS matter_number TEXT UNIQUE;
--> statement-breakpoint

-- ─── 3. Grant cases access to app role ───────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON cases TO icrm_app;
--> statement-breakpoint

-- ─── 4. case_events audit log table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_events (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id     TEXT        NOT NULL REFERENCES firms(id)  ON DELETE CASCADE,
  case_id     TEXT        NOT NULL REFERENCES cases(id)  ON DELETE CASCADE,
  actor_id    TEXT                 REFERENCES users(id)  ON DELETE SET NULL,
  event_type  TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  metadata    JSONB                DEFAULT '{}',
  created_at  TIMESTAMPTZ          DEFAULT now(),

  CONSTRAINT case_events_event_type_check CHECK (
    event_type IN (
      'case_created','status_changed','assignment_changed',
      'document_added','task_added','note_added','metadata_updated'
    )
  )
);
--> statement-breakpoint

-- ─── 5. Indexes for fast timeline queries ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_case_events_case_id    ON case_events(case_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_case_events_firm_id    ON case_events(firm_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_case_events_created_at ON case_events(created_at DESC);
--> statement-breakpoint

-- ─── 6. RLS on case_events ───────────────────────────────────────────────────
GRANT SELECT, INSERT ON case_events TO icrm_app;
--> statement-breakpoint
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE case_events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON case_events;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON case_events
  USING (firm_id = current_setting('app.current_firm_id', true));
