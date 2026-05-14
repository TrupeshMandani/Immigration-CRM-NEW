-- Billing: Stripe Connect + trust ledger + retainer agreements
-- Idempotent — safe to re-run.

-- ─── firm_stripe_accounts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS firm_stripe_accounts (
  firm_id              TEXT PRIMARY KEY REFERENCES firms(id) ON DELETE CASCADE,
  stripe_account_id    TEXT NOT NULL UNIQUE,
  operating_account_id TEXT,
  trust_account_id     TEXT,
  onboarding_status    TEXT NOT NULL DEFAULT 'pending',
  charges_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON firm_stripe_accounts TO icrm_app;
--> statement-breakpoint
ALTER TABLE firm_stripe_accounts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE firm_stripe_accounts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON firm_stripe_accounts;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON firm_stripe_accounts
  USING (firm_id = current_setting('app.current_firm_id', true));

-- ─── retainer_agreements ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retainer_agreements (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  student_id       TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  version          INTEGER NOT NULL DEFAULT 1,
  template_key     TEXT NOT NULL,
  rendered_html    TEXT,
  signed_at        TIMESTAMPTZ,
  signed_ip        TEXT,
  signed_user_agent TEXT,
  pdf_s3_key       TEXT,
  scope            JSONB NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','signed','withdrawn')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS retainer_agreements_firm_student_idx
  ON retainer_agreements (firm_id, student_id);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON retainer_agreements TO icrm_app;
--> statement-breakpoint
ALTER TABLE retainer_agreements ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE retainer_agreements FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON retainer_agreements;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON retainer_agreements
  USING (firm_id = current_setting('app.current_firm_id', true));

-- ─── invoices ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                   TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  student_id                TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  retainer_id               TEXT REFERENCES retainer_agreements(id) ON DELETE SET NULL,
  amount_cents              INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'CAD',
  status                    TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','void','refunded')),
  stripe_invoice_id         TEXT,
  stripe_payment_intent_id  TEXT,
  issued_at                 TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,
  due_at                    TIMESTAMPTZ,
  line_items                JSONB NOT NULL DEFAULT '[]',
  created_at                TIMESTAMPTZ DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS invoices_firm_student_idx
  ON invoices (firm_id, student_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS invoices_stripe_invoice_id_idx
  ON invoices (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO icrm_app;
--> statement-breakpoint
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON invoices;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON invoices
  USING (firm_id = current_setting('app.current_firm_id', true));

-- ─── trust_ledger ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trust_ledger (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                 TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  student_id              TEXT REFERENCES students(id) ON DELETE SET NULL,
  amount_cents            INTEGER NOT NULL,
  entry_type              TEXT NOT NULL
    CHECK (entry_type IN ('deposit','withdrawal','transfer_to_operating','refund')),
  related_invoice_id      TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  related_stripe_charge_id TEXT,
  description             TEXT,
  recorded_by             TEXT REFERENCES users(id) ON DELETE SET NULL,
  reconciled              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trust_ledger_firm_month_idx
  ON trust_ledger (firm_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trust_ledger_reconciled_idx
  ON trust_ledger (firm_id, reconciled)
  WHERE reconciled = FALSE;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON trust_ledger TO icrm_app;
--> statement-breakpoint
ALTER TABLE trust_ledger ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE trust_ledger FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON trust_ledger;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON trust_ledger
  USING (firm_id = current_setting('app.current_firm_id', true));
