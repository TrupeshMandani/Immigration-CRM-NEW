-- notifications: Postgres-backed notification ledger replacing Mongoose Notification model.
-- Idempotent — safe to re-run.
CREATE TABLE IF NOT EXISTS notifications (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  payload       JSONB DEFAULT '{}'::JSONB,
  read_at       TIMESTAMPTZ,
  delivered_via TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (firm_id, user_id, created_at DESC)
  WHERE read_at IS NULL;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO icrm_app;
--> statement-breakpoint
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON notifications;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON notifications
  USING (firm_id = current_setting('app.current_firm_id', true));
