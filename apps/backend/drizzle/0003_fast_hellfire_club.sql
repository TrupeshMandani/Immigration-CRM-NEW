-- ── 1. Rename core table: students → applicants ──────────────────────────────
ALTER TABLE students RENAME TO applicants;

--> statement-breakpoint
-- ── 2. Rename student_id columns in all dependent tables ─────────────────────
ALTER TABLE documents           RENAME COLUMN student_id TO applicant_id;
--> statement-breakpoint
ALTER TABLE tasks               RENAME COLUMN student_id TO applicant_id;
--> statement-breakpoint
ALTER TABLE invoices            RENAME COLUMN student_id TO applicant_id;
--> statement-breakpoint
ALTER TABLE retainer_agreements RENAME COLUMN student_id TO applicant_id;
--> statement-breakpoint
ALTER TABLE trust_ledger        RENAME COLUMN student_id TO applicant_id;

--> statement-breakpoint
-- ── 3. Fix the FK on documents (Drizzle-tracked; must drop+recreate after rename) ──
ALTER TABLE documents DROP CONSTRAINT IF EXISTS "documents_student_id_students_id_fk";
--> statement-breakpoint
ALTER TABLE documents ADD CONSTRAINT "documents_applicant_id_applicants_id_fk"
  FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE CASCADE;

--> statement-breakpoint
-- ── 4. Update user role constraint ───────────────────────────────────────────
UPDATE users SET role = 'applicant' WHERE role = 'student';
--> statement-breakpoint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','senior','junior','applicant'));

--> statement-breakpoint
-- ── 5. Create cases table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "cases" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "firm_id" text NOT NULL,
  "applicant_id" text NOT NULL,
  "assigned_to" text,
  "case_type" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "cases_case_type_check" CHECK (case_type IN ('study_permit','pgwp','pr','citizenship','visitor_visa','work_permit','other')),
  CONSTRAINT "cases_status_check" CHECK (status IN ('open','in_progress','submitted','approved','rejected','closed'))
);
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_firm_id_firms_id_fk"
  FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicant_id_applicants_id_fk"
  FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_to_users_id_fk"
  FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL;

--> statement-breakpoint
-- ── 6. Add case_id to all referencing tables ─────────────────────────────────
ALTER TABLE "documents"           ADD COLUMN IF NOT EXISTS "case_id" text REFERENCES cases(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "tasks"               ADD COLUMN IF NOT EXISTS "case_id" text REFERENCES cases(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "invoices"            ADD COLUMN IF NOT EXISTS "case_id" text REFERENCES cases(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "retainer_agreements" ADD COLUMN IF NOT EXISTS "case_id" text REFERENCES cases(id) ON DELETE SET NULL;

--> statement-breakpoint
-- ── 7. RLS for cases ─────────────────────────────────────────────────────────
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE cases FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON cases;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON cases
  USING (firm_id = current_setting('app.current_firm_id', true));

--> statement-breakpoint
-- ── 8. Grant permissions ─────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON applicants TO icrm_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON cases TO icrm_app;
