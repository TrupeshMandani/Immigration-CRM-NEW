-- ── Rename students → applicants ─────────────────────────────────────────────
-- Renames the core entity table and all student_id FK columns.
-- FK constraints are automatically updated by Postgres when the column is renamed.
-- RLS policy on students automatically follows the table rename.

-- 1. Rename core table
ALTER TABLE students RENAME TO applicants;

-- 2. Rename student_id columns in all dependent tables
ALTER TABLE documents           RENAME COLUMN student_id TO applicant_id;
ALTER TABLE tasks               RENAME COLUMN student_id TO applicant_id;
ALTER TABLE invoices            RENAME COLUMN student_id TO applicant_id;
ALTER TABLE retainer_agreements RENAME COLUMN student_id TO applicant_id;
ALTER TABLE trust_ledger        RENAME COLUMN student_id TO applicant_id;

-- 3. Update user role data then drop/recreate the check constraint
UPDATE users SET role = 'applicant' WHERE role = 'student';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','senior','junior','applicant'));

-- 4. Rename indexes for clarity
ALTER INDEX IF EXISTS retainer_agreements_firm_student_idx
  RENAME TO retainer_agreements_firm_applicant_idx;
ALTER INDEX IF EXISTS invoices_firm_student_idx
  RENAME TO invoices_firm_applicant_idx;

-- 5. Grant access for the renamed table (icrm_app already has grants on the object,
--    which follow the rename — this is a no-op safety guard)
GRANT SELECT, INSERT, UPDATE, DELETE ON applicants TO icrm_app;
