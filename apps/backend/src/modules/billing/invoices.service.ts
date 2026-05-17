import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../../db/postgres';
import { invoices, type Invoice, type InvoiceLineItem } from '../../db/schema/invoices';
import { students } from '../../db/schema/students';
import { firmStripeAccounts } from '../../db/schema/firm_stripe_accounts';

type DbClient = typeof db;

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion });
}

function notFound(msg: string): never {
  throw Object.assign(new Error(msg), { statusCode: 404 });
}

function forbidden(): never {
  throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
}

// ─── createInvoice ────────────────────────────────────────────────────────────
export async function createInvoice(
  dbClient: DbClient,
  firmId: string,
  studentId: string,
  lineItems: InvoiceLineItem[],
  options?: { retainerId?: string; dueAt?: Date },
): Promise<Invoice> {
  const totalCents = lineItems.reduce(
    (sum, li) => sum + li.amount_cents * (li.quantity ?? 1),
    0,
  );

  const [invoice] = await dbClient
    .insert(invoices)
    .values({
      firm_id: firmId,
      student_id: studentId,
      retainer_id: options?.retainerId ?? null,
      amount_cents: totalCents,
      status: 'draft',
      line_items: lineItems,
      due_at: options?.dueAt ?? null,
    })
    .returning();

  return invoice;
}

// ─── sendInvoice ──────────────────────────────────────────────────────────────
// Creates a Stripe Invoice, attaches line items, finalizes, and emails student.
export async function sendInvoice(
  dbClient: DbClient,
  firmId: string,
  invoiceId: string,
): Promise<Invoice> {
  const [inv] = await dbClient
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv) notFound('Invoice not found');
  if (inv.firm_id !== firmId) forbidden();

  const [student] = await dbClient
    .select()
    .from(students)
    .where(eq(students.id, inv.student_id))
    .limit(1);
  if (!student) notFound('Student not found');

  const [stripeAcct] = await dbClient
    .select()
    .from(firmStripeAccounts)
    .where(eq(firmStripeAccounts.firm_id, firmId))
    .limit(1);

  const s = stripe();
  const opts = stripeAcct ? ({ stripeAccount: stripeAcct.stripe_account_id } as object) : {};

  // Resolve or create Stripe customer for this student.
  const existing = await s.customers.list({ email: student.email, limit: 1 }, opts as any);
  const customerId =
    existing.data.length > 0
      ? existing.data[0].id
      : (
          await s.customers.create(
            {
              email: student.email,
              name: [student.first_name, student.last_name].filter(Boolean).join(' '),
            },
            opts as any,
          )
        ).id;

  const stripeInvoice = await s.invoices.create(
    {
      customer: customerId,
      currency: inv.currency.toLowerCase(),
      collection_method: 'send_invoice',
      days_until_due: 30,
      auto_advance: false,
    },
    opts as any,
  );

  for (const li of inv.line_items as InvoiceLineItem[]) {
    await s.invoiceItems.create(
      {
        customer: customerId,
        invoice: stripeInvoice.id,
        amount: li.amount_cents * (li.quantity ?? 1),
        currency: inv.currency.toLowerCase(),
        description: li.description,
      },
      opts as any,
    );
  }

  await s.invoices.finalizeInvoice(stripeInvoice.id, opts as any);
  const sent = await s.invoices.sendInvoice(stripeInvoice.id, opts as any);

  const [updated] = await dbClient
    .update(invoices)
    .set({
      status: 'sent',
      stripe_invoice_id: stripeInvoice.id,
      stripe_payment_intent_id:
        typeof sent.payment_intent === 'string'
          ? sent.payment_intent
          : (sent.payment_intent?.id ?? null),
      issued_at: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return updated;
}

// ─── markPaid ─────────────────────────────────────────────────────────────────
// Called by the invoice.paid webhook — not exposed directly via API.
export async function markPaid(
  dbClient: DbClient,
  stripeInvoiceId: string,
): Promise<Invoice | null> {
  const [updated] = await dbClient
    .update(invoices)
    .set({ status: 'paid', paid_at: new Date() })
    .where(eq(invoices.stripe_invoice_id, stripeInvoiceId))
    .returning();
  return updated ?? null;
}

// ─── listInvoices ─────────────────────────────────────────────────────────────
export async function listInvoices(dbClient: DbClient, firmId: string): Promise<Invoice[]> {
  return dbClient.select().from(invoices).where(eq(invoices.firm_id, firmId));
}

// ─── createCheckoutSession ────────────────────────────────────────────────────
// Creates a Stripe Checkout Session so a student can pay via the hosted page.
export async function createCheckoutSession(
  dbClient: DbClient,
  firmId: string,
  invoiceId: string,
  baseUrl: string,
): Promise<{ url: string }> {
  const [inv] = await dbClient
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv || inv.firm_id !== firmId) notFound('Invoice not found');
  if (inv.status === 'paid') {
    throw Object.assign(new Error('Invoice is already paid'), { statusCode: 400 });
  }

  const [stripeAcct] = await dbClient
    .select()
    .from(firmStripeAccounts)
    .where(eq(firmStripeAccounts.firm_id, firmId))
    .limit(1);

  const s = stripe();
  const opts = stripeAcct ? ({ stripeAccount: stripeAcct.stripe_account_id } as object) : {};

  const lineItems = (inv.line_items as InvoiceLineItem[]).map((li) => ({
    price_data: {
      currency: inv.currency.toLowerCase(),
      product_data: { name: li.description },
      unit_amount: li.amount_cents,
    },
    quantity: li.quantity ?? 1,
  }));

  const session = await (s.checkout.sessions.create as Function)(
    {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${baseUrl}/student/pay-invoice?status=success&invoiceId=${invoiceId}`,
      cancel_url: `${baseUrl}/student/pay-invoice?status=cancel&invoiceId=${invoiceId}`,
      metadata: { invoiceId, firmId },
    },
    opts,
  );

  return { url: session.url as string };
}

// ─── getInvoice ───────────────────────────────────────────────────────────────
export async function getInvoice(
  dbClient: DbClient,
  firmId: string,
  invoiceId: string,
): Promise<Invoice> {
  const [inv] = await dbClient
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv || inv.firm_id !== firmId) notFound('Invoice not found');
  return inv;
}
