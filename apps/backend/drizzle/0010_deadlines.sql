-- 0. Expand case_events event_type constraint to include deadline events
ALTER TABLE case_events DROP CONSTRAINT IF EXISTS case_events_event_type_check;
ALTER TABLE case_events ADD CONSTRAINT case_events_event_type_check CHECK (
  event_type IN (
    'case_created', 'status_changed', 'assignment_changed',
    'document_added', 'task_added', 'note_added', 'metadata_updated',
    'deadline_added', 'deadline_updated', 'deadline_acknowledged'
  )
);

--> statement-breakpoint

-- 1. Add iCal token column to firms (for external calendar subscription)
ALTER TABLE firms ADD COLUMN IF NOT EXISTS ical_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

--> statement-breakpoint

-- 2. Create deadlines table
CREATE TABLE IF NOT EXISTS deadlines (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id                   TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_id                   TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  applicant_id              TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  assigned_to               TEXT REFERENCES users(id) ON DELETE SET NULL,
  deadline_type             TEXT NOT NULL,
  label                     TEXT NOT NULL,
  due_date                  DATE NOT NULL,
  description               TEXT,
  auto_calculated           BOOLEAN NOT NULL DEFAULT false,
  days_before_notification  INTEGER[] NOT NULL DEFAULT '{30,14,7}',
  acknowledged_at           TIMESTAMPTZ,
  acknowledged_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  metadata                  JSONB NOT NULL DEFAULT '{}',
  created_by                TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT deadlines_deadline_type_check CHECK (
    deadline_type IN (
      'work_permit_expiry', 'study_permit_expiry', 'visitor_visa_expiry',
      'pr_card_expiry', 'passport_expiry', 'rfe_response', 'filing_deadline',
      'biometrics_appointment', 'medical_exam', 'interview_date',
      'ita_expiry', 'copr_expiry', 'bridging_permit_expiry',
      'lmia_expiry', 'custom'
    )
  )
);

--> statement-breakpoint

-- 3. Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_deadlines_firm_id      ON deadlines(firm_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_case_id      ON deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_applicant_id ON deadlines(applicant_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date     ON deadlines(due_date ASC);
CREATE INDEX IF NOT EXISTS idx_deadlines_assigned_to  ON deadlines(assigned_to);
-- Partial index: only unacknowledged deadlines (90% of queries filter on this)
CREATE INDEX IF NOT EXISTS idx_deadlines_unacked ON deadlines(firm_id, due_date)
  WHERE acknowledged_at IS NULL;

--> statement-breakpoint

-- 4. Row Level Security
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON deadlines
  USING (firm_id = current_setting('app.current_firm_id', true));

--> statement-breakpoint

-- 5. Grant to app role
GRANT SELECT, INSERT, UPDATE, DELETE ON deadlines TO icrm_app;
