-- Grant icrm_app access to the new tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON applicants TO icrm_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO icrm_app;
--> statement-breakpoint
-- ── applicants ─────────────────────────────────────────────────────────────────
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE applicants FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON applicants;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON applicants
  USING (firm_id = current_setting('app.current_firm_id', true));
--> statement-breakpoint
-- ── documents ────────────────────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON documents;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON documents
  USING (firm_id = current_setting('app.current_firm_id', true));
