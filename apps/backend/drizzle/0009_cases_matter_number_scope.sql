-- Matter numbers are unique per-firm, not globally.
-- A firm can have ICRM-2026-00001 and so can another firm.
-- Idempotent — safe to re-run.

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_matter_number_key;
--> statement-breakpoint
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_matter_number_firm_key;
--> statement-breakpoint
ALTER TABLE cases ADD CONSTRAINT cases_matter_number_firm_key
  UNIQUE (firm_id, matter_number);
