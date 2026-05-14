import Stripe from 'stripe';
import { eq, and, gte, lt } from 'drizzle-orm';
import { db } from '../../db/postgres';
import { trustLedger, type TrustLedgerEntry } from '../../db/schema/trust_ledger';
import { firmStripeAccounts } from '../../db/schema/firm_stripe_accounts';

type DbClient = typeof db;

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion });
}

export interface TrustEntryParams {
  studentId?: string;
  amountCents: number;
  relatedInvoiceId?: string;
  relatedStripeChargeId?: string;
  description?: string;
  recordedBy?: string;
}

export interface ReconciliationReport {
  firmId: string;
  year: number;
  month: number;
  ledgerDepositsCents: number;
  ledgerWithdrawalsCents: number;
  ledgerNetCents: number;
  stripeBalanceCents: number | null;
  differenceCents: number | null;
  isBalanced: boolean;
  entries: TrustLedgerEntry[];
}

// ─── recordDeposit ────────────────────────────────────────────────────────────
export async function recordDeposit(
  dbClient: DbClient,
  firmId: string,
  params: TrustEntryParams,
): Promise<TrustLedgerEntry> {
  const [entry] = await dbClient
    .insert(trustLedger)
    .values({
      firm_id: firmId,
      student_id: params.studentId ?? null,
      amount_cents: Math.abs(params.amountCents),
      entry_type: 'deposit',
      related_invoice_id: params.relatedInvoiceId ?? null,
      related_stripe_charge_id: params.relatedStripeChargeId ?? null,
      description: params.description ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .returning();
  return entry;
}

// ─── recordWithdrawal ─────────────────────────────────────────────────────────
export async function recordWithdrawal(
  dbClient: DbClient,
  firmId: string,
  params: TrustEntryParams,
): Promise<TrustLedgerEntry> {
  const [entry] = await dbClient
    .insert(trustLedger)
    .values({
      firm_id: firmId,
      student_id: params.studentId ?? null,
      amount_cents: -Math.abs(params.amountCents),
      entry_type: 'withdrawal',
      related_invoice_id: params.relatedInvoiceId ?? null,
      related_stripe_charge_id: params.relatedStripeChargeId ?? null,
      description: params.description ?? null,
      recorded_by: params.recordedBy ?? null,
    })
    .returning();
  return entry;
}

// ─── recordTransfer ───────────────────────────────────────────────────────────
// Records an outbound transfer from client trust to firm operating account.
export async function recordTransfer(
  dbClient: DbClient,
  firmId: string,
  params: TrustEntryParams,
): Promise<TrustLedgerEntry> {
  const [entry] = await dbClient
    .insert(trustLedger)
    .values({
      firm_id: firmId,
      student_id: params.studentId ?? null,
      amount_cents: -Math.abs(params.amountCents),
      entry_type: 'transfer_to_operating',
      related_invoice_id: params.relatedInvoiceId ?? null,
      related_stripe_charge_id: params.relatedStripeChargeId ?? null,
      description: params.description ?? 'Transfer from trust to operating account',
      recorded_by: params.recordedBy ?? null,
    })
    .returning();
  return entry;
}

// ─── generateMonthlyReconciliation ───────────────────────────────────────────
// Sums the trust_ledger for the given month and compares to the Stripe trust
// account balance. Returns null for stripeBalanceCents if no trust account is
// configured, so the caller can surface a warning.
export async function generateMonthlyReconciliation(
  dbClient: DbClient,
  firmId: string,
  year: number,
  month: number,
): Promise<ReconciliationReport> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const entries = await dbClient
    .select()
    .from(trustLedger)
    .where(
      and(
        eq(trustLedger.firm_id, firmId),
        gte(trustLedger.created_at, monthStart),
        lt(trustLedger.created_at, monthEnd),
      ),
    );

  let ledgerDepositsCents = 0;
  let ledgerWithdrawalsCents = 0;
  for (const e of entries) {
    if (e.amount_cents > 0) ledgerDepositsCents += e.amount_cents;
    else ledgerWithdrawalsCents += e.amount_cents;
  }
  const ledgerNetCents = ledgerDepositsCents + ledgerWithdrawalsCents;

  // Fetch Stripe trust account balance if configured.
  let stripeBalanceCents: number | null = null;
  try {
    const [acct] = await dbClient
      .select()
      .from(firmStripeAccounts)
      .where(eq(firmStripeAccounts.firm_id, firmId))
      .limit(1);

    if (acct?.trust_account_id) {
      const balance = await stripe().balance.retrieve({
        stripeAccount: acct.trust_account_id,
      } as any);
      const cadBalance = balance.available.find((b) => b.currency === 'cad');
      stripeBalanceCents = cadBalance?.amount ?? 0;
    }
  } catch {
    // Non-fatal: return null so the caller can surface a warning.
  }

  const differenceCents =
    stripeBalanceCents !== null ? ledgerNetCents - stripeBalanceCents : null;

  return {
    firmId,
    year,
    month,
    ledgerDepositsCents,
    ledgerWithdrawalsCents,
    ledgerNetCents,
    stripeBalanceCents,
    differenceCents,
    isBalanced: differenceCents === 0,
    entries,
  };
}
