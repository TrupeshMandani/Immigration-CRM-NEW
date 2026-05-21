/**
 * Billing integration tests.
 *
 * Real Postgres is used for all persistence (RLS enforced via withFirmContext).
 * Stripe API calls are mocked via vi.mock so no live keys are needed.
 * S3 PutObjectCommand is mocked so no AWS credentials are needed.
 *
 * Coverage:
 *   - createInvoice, sendInvoice, markPaid
 *   - recordDeposit, recordWithdrawal, recordTransfer, generateMonthlyReconciliation
 *   - createDraft, sendForSignature, finalizeSignature
 *   - Cross-tenant isolation: Firm B cannot read Firm A billing data
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, withFirmContext } from '../../../db/postgres';
import { firms } from '../../../db/schema/firms';
import { applicants } from '../../../db/schema/applicants';
import { invoices } from '../../../db/schema/invoices';
import { trustLedger } from '../../../db/schema/trust_ledger';
import { retainerAgreements } from '../../../db/schema/retainer_agreements';
import { createApplicant } from '../../applicants/applicants.service';

// ─── Stripe mock ──────────────────────────────────────────────────────────────
vi.mock('stripe', () => {
  const mockStripe = vi.fn().mockImplementation(() => ({
    accounts: {
      create: vi.fn().mockResolvedValue({
        id: 'acct_mock_connect',
        charges_enabled: false,
      }),
    },
    accountLinks: {
      create: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com/mock-onboard' }),
    },
    customers: {
      list: vi.fn().mockResolvedValue({ data: [] }),
      create: vi.fn().mockResolvedValue({ id: 'cus_mock' }),
    },
    invoices: {
      create: vi.fn().mockResolvedValue({ id: 'in_mock' }),
      finalizeInvoice: vi.fn().mockResolvedValue({}),
      sendInvoice: vi.fn().mockResolvedValue({
        id: 'in_mock',
        payment_intent: 'pi_mock',
      }),
    },
    invoiceItems: {
      create: vi.fn().mockResolvedValue({}),
    },
    balance: {
      retrieve: vi.fn().mockResolvedValue({
        available: [{ currency: 'cad', amount: 50000 }],
      }),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  }));
  return { default: mockStripe };
});

// ─── S3 mock ──────────────────────────────────────────────────────────────────
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn().mockImplementation((params) => params),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────
const tag = Date.now();
let firmAId: string;
let firmBId: string;
let studentAId: string;
let studentBId: string;

beforeAll(async () => {
  const [firmA] = await db
    .insert(firms)
    .values({ name: `Billing Test Firm A ${tag}`, slug: `billing-a-${tag}` })
    .returning();
  firmAId = firmA.id;

  const [firmB] = await db
    .insert(firms)
    .values({ name: `Billing Test Firm B ${tag}`, slug: `billing-b-${tag}` })
    .returning();
  firmBId = firmB.id;

  const sA = await withFirmContext(firmAId, (tx) =>
    createApplicant(tx as typeof db, firmAId, {
      email: `billing-student-a-${tag}@test.com`,
      first_name: 'Alice',
      last_name: 'Billing',
    }),
  );
  studentAId = sA.id;

  const sB = await withFirmContext(firmBId, (tx) =>
    createApplicant(tx as typeof db, firmBId, {
      email: `billing-student-b-${tag}@test.com`,
      first_name: 'Bob',
      last_name: 'Billing',
    }),
  );
  studentBId = sB.id;
});

afterAll(async () => {
  if (firmAId) await db.delete(firms).where(eq(firms.id, firmAId));
  if (firmBId) await db.delete(firms).where(eq(firms.id, firmBId));
});

// ─── Invoice creation ─────────────────────────────────────────────────────────
describe('invoices service', () => {
  let invoiceId: string;

  it('createInvoice — creates a draft invoice with correct total', async () => {
    const { createInvoice } = await import('../invoices.service');

    const inv = await withFirmContext(firmAId, (tx) =>
      createInvoice(tx as typeof db, firmAId, studentAId, [
        { description: 'Study permit prep', amount_cents: 75000 },
        { description: 'Government fee', amount_cents: 15000, quantity: 1 },
      ]),
    );

    expect(inv.id).toBeTruthy();
    expect(inv.firm_id).toBe(firmAId);
    expect(inv.applicant_id).toBe(studentAId);
    expect(inv.amount_cents).toBe(90000);
    expect(inv.status).toBe('draft');
    expect(inv.currency).toBe('CAD');
    invoiceId = inv.id;
  });

  it('createInvoice — sums line items with quantity correctly', async () => {
    const { createInvoice } = await import('../invoices.service');

    const inv = await withFirmContext(firmAId, (tx) =>
      createInvoice(tx as typeof db, firmAId, studentAId, [
        { description: 'Hour of consulting', amount_cents: 20000, quantity: 3 },
      ]),
    );

    expect(inv.amount_cents).toBe(60000);
  });

  it('sendInvoice — calls Stripe and updates status to sent', async () => {
    const { sendInvoice } = await import('../invoices.service');

    const updated = await withFirmContext(firmAId, (tx) =>
      sendInvoice(tx as typeof db, firmAId, invoiceId),
    );

    expect(updated.status).toBe('sent');
    expect(updated.stripe_invoice_id).toBe('in_mock');
    expect(updated.stripe_payment_intent_id).toBe('pi_mock');
    expect(updated.issued_at).toBeTruthy();
  });

  it('markPaid — sets status=paid and paid_at', async () => {
    const { markPaid } = await import('../invoices.service');

    const updated = await markPaid(db, 'in_mock');
    expect(updated?.status).toBe('paid');
    expect(updated?.paid_at).toBeTruthy();
  });
});

// ─── Trust ledger ─────────────────────────────────────────────────────────────
describe('trust service', () => {
  it('recordDeposit — persists a positive amount_cents entry', async () => {
    const { recordDeposit } = await import('../trust.service');

    const entry = await withFirmContext(firmAId, (tx) =>
      recordDeposit(tx as typeof db, firmAId, {
        studentId: studentAId,
        amountCents: 90000,
        description: 'Initial retainer deposit',
      }),
    );

    expect(entry.id).toBeTruthy();
    expect(entry.amount_cents).toBe(90000);
    expect(entry.entry_type).toBe('deposit');
    expect(entry.reconciled).toBe(false);
  });

  it('recordWithdrawal — persists a negative amount_cents entry', async () => {
    const { recordWithdrawal } = await import('../trust.service');

    const entry = await withFirmContext(firmAId, (tx) =>
      recordWithdrawal(tx as typeof db, firmAId, {
        studentId: studentAId,
        amountCents: 30000,
        description: 'Fee earned — application submitted',
      }),
    );

    expect(entry.amount_cents).toBe(-30000);
    expect(entry.entry_type).toBe('withdrawal');
  });

  it('recordTransfer — entry_type is transfer_to_operating', async () => {
    const { recordTransfer } = await import('../trust.service');

    const entry = await withFirmContext(firmAId, (tx) =>
      recordTransfer(tx as typeof db, firmAId, {
        amountCents: 15000,
        description: 'Transfer earned fees to operating account',
      }),
    );

    expect(entry.entry_type).toBe('transfer_to_operating');
    expect(entry.amount_cents).toBeLessThan(0);
  });

  it('generateMonthlyReconciliation — returns ledger sums and Stripe balance', async () => {
    const { generateMonthlyReconciliation } = await import('../trust.service');

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const report = await withFirmContext(firmAId, (tx) =>
      generateMonthlyReconciliation(tx as typeof db, firmAId, year, month),
    );

    expect(report.firmId).toBe(firmAId);
    expect(report.ledgerDepositsCents).toBeGreaterThan(0);
    expect(report.ledgerWithdrawalsCents).toBeLessThan(0);
    expect(typeof report.ledgerNetCents).toBe('number');
    // Stripe balance mock returns null when no trust_account_id is configured.
    expect(report).toHaveProperty('stripeBalanceCents');
    expect(report).toHaveProperty('isBalanced');
  });
});

// ─── Retainer signing flow ────────────────────────────────────────────────────
describe('retainers service', () => {
  let retainerId: string;

  it('listTemplates — returns the 3 starter templates', () => {
    const { listTemplates } = require('../retainers.service');
    const templates = listTemplates();
    const keys = templates.map((t: { key: string }) => t.key);
    expect(keys).toContain('study_permit_v1');
    expect(keys).toContain('pgwp_v1');
    expect(keys).toContain('generic_v1');
  });

  it('createDraft — renders template with student vars and persists', async () => {
    const { createDraft } = await import('../retainers.service');

    const agreement = await withFirmContext(firmAId, (tx) =>
      createDraft(tx as typeof db, firmAId, studentAId, 'study_permit_v1', {
        institution: 'University of Toronto',
        program: 'Computer Science',
        professionalFee: '900.00',
        governmentFee: '150.00',
      }),
    );

    expect(agreement.id).toBeTruthy();
    expect(agreement.status).toBe('draft');
    expect(agreement.template_key).toBe('study_permit_v1');
    expect(agreement.rendered_html).toContain('Alice Billing');
    expect(agreement.rendered_html).toContain('University of Toronto');
    retainerId = agreement.id;
  });

  it('sendForSignature — transitions status to sent and returns sign URL', async () => {
    const { sendForSignature } = await import('../retainers.service');

    const { signUrl, agreement } = await withFirmContext(firmAId, (tx) =>
      sendForSignature(tx as typeof db, firmAId, retainerId, 'http://localhost:5173'),
    );

    expect(signUrl).toContain(retainerId);
    expect(agreement.status).toBe('sent');
  });

  it('sendForSignature — rejects if already sent', async () => {
    const { sendForSignature } = await import('../retainers.service');

    await expect(
      withFirmContext(firmAId, (tx) =>
        sendForSignature(tx as typeof db, firmAId, retainerId, 'http://localhost:5173'),
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('finalizeSignature — marks signed and uploads immutable copy to S3', async () => {
    const { finalizeSignature } = await import('../retainers.service');

    const signed = await withFirmContext(firmAId, (tx) =>
      finalizeSignature(
        tx as typeof db,
        firmAId,
        retainerId,
        'Alice Billing',
        '127.0.0.1',
        'vitest/1.0',
      ),
    );

    expect(signed.status).toBe('signed');
    expect(signed.signed_at).toBeTruthy();
    expect(signed.signed_ip).toBe('127.0.0.1');
    expect(signed.pdf_s3_key).toContain(retainerId);
  });
});

// ─── Cross-tenant isolation ───────────────────────────────────────────────────
describe('cross-tenant isolation', () => {
  it('Firm B cannot read Firm A invoices via withFirmContext', async () => {
    const { createInvoice } = await import('../invoices.service');

    // Create an invoice for firm A.
    const inv = await withFirmContext(firmAId, (tx) =>
      createInvoice(tx as typeof db, firmAId, studentAId, [
        { description: 'Isolated service', amount_cents: 10000 },
      ]),
    );

    // Firm B context should return zero rows.
    const rows = await withFirmContext(firmBId, (tx) =>
      tx.select().from(invoices).where(eq(invoices.id, inv.id)),
    );
    expect(rows).toHaveLength(0);
  });

  it('Firm B cannot read Firm A trust ledger entries', async () => {
    const { recordDeposit } = await import('../trust.service');

    const entry = await withFirmContext(firmAId, (tx) =>
      recordDeposit(tx as typeof db, firmAId, {
        studentId: studentAId,
        amountCents: 5000,
        description: 'Cross-tenant isolation test deposit',
      }),
    );

    const rows = await withFirmContext(firmBId, (tx) =>
      tx.select().from(trustLedger).where(eq(trustLedger.id, entry.id)),
    );
    expect(rows).toHaveLength(0);
  });

  it('Firm B cannot read Firm A retainer agreements', async () => {
    const { createDraft } = await import('../retainers.service');

    const agreement = await withFirmContext(firmAId, (tx) =>
      createDraft(tx as typeof db, firmAId, studentAId, 'generic_v1', {}),
    );

    const rows = await withFirmContext(firmBId, (tx) =>
      tx
        .select()
        .from(retainerAgreements)
        .where(eq(retainerAgreements.id, agreement.id)),
    );
    expect(rows).toHaveLength(0);
  });

  it('Firm B student cannot be used for Firm A invoice', async () => {
    const { createInvoice } = await import('../invoices.service');

    // Firm A context + Firm B student — should fail the FK + RLS constraint.
    await expect(
      withFirmContext(firmAId, (tx) =>
        createInvoice(tx as typeof db, firmAId, studentBId, [
          { description: 'Should fail', amount_cents: 1000 },
        ]),
      ),
    ).rejects.toThrow();
  });
});
