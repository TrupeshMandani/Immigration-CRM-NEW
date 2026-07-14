-- Extend the applicant lifecycle with terminal outcome states.
--   'passed'   → the applicant's file was successfully passed/completed.
--   'rejected' → the applicant's file was rejected.
-- 'closed' is kept as the separate deactivate / soft-delete state.
-- Idempotent: safe to re-run.
-- The applicants table historically carried a legacy 'students_status_check'
-- constraint (it was derived from the students table). Drop it so it no longer
-- enforces the old, narrower status set alongside applicants_status_check.
ALTER TABLE applicants DROP CONSTRAINT IF EXISTS students_status_check;
--> statement-breakpoint
ALTER TABLE applicants DROP CONSTRAINT IF EXISTS applicants_status_check;
--> statement-breakpoint
ALTER TABLE applicants ADD CONSTRAINT applicants_status_check
  CHECK (status IN ('pending','registered','active','closed','passed','rejected'));
