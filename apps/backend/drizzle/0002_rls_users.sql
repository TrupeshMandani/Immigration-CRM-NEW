-- Create a non-superuser application role.
-- Migrations run as icrm (superuser); the app runs as icrm_app, which IS
-- subject to RLS. Superusers bypass RLS unconditionally in Postgres, so
-- this separation is required for RLS to be meaningful.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'icrm_app') THEN
    CREATE ROLE icrm_app NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
-- Grant icrm_app access to all existing and future tables in public schema.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO icrm_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO icrm_app;
--> statement-breakpoint
-- Enable RLS on the users table.
-- FORCE ensures the table owner (icrm) is also subject to the policy, though
-- superusers still bypass it — hence the icrm_app role above.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE users FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Tenant isolation policy: only rows whose firm_id matches the current
-- session setting are visible. Returns zero rows when no context is set.
-- Note: firm_id is stored as text (consistent with firms.id), so we compare
-- text = text without a ::uuid cast.
DROP POLICY IF EXISTS tenant_isolation ON users;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON users
  USING (firm_id = current_setting('app.current_firm_id', true));
--> statement-breakpoint
-- set_app_context is called once per transaction (inside withFirmContext)
-- to scope all queries in that transaction to a single firm.
CREATE OR REPLACE FUNCTION set_app_context(p_firm_id text) RETURNS void
  LANGUAGE plpgsql AS $$
  BEGIN
    PERFORM set_config('app.current_firm_id', p_firm_id, true);
  END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION set_app_context TO PUBLIC;
