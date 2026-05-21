/**
 * POST /api/webhooks/stripe
 *
 * Stripe sends all events here. Signature verification uses the raw request
 * body — express.raw() must be mounted on this path BEFORE express.json()
 * runs (handled in src/index.js).
 *
 * Handled events:
 *   invoice.paid              — mark invoice paid, record trust deposit
 *   payment_intent.succeeded  — supplementary logging
 *   account.updated           — sync charges_enabled flag for Connect accounts
 */
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db, withFirmContext } from '../../db/postgres';
import { invoices } from '../../db/schema/invoices';
import { trustLedger } from '../../db/schema/trust_ledger';
import { firmStripeAccounts } from '../../db/schema/firm_stripe_accounts';
import { eq } from 'drizzle-orm';

export const webhookRouter = Router();

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion });
}

webhookRouter.post(
  '/stripe',
  // express.raw() is applied globally for this path in index.js before express.json().
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;
    try {
      // req.body is a Buffer when express.raw() runs before express.json().
      event = stripeClient().webhooks.constructEvent(req.body as Buffer, sig ?? '', secret);
    } catch (err) {
      const msg = (err as Error).message;
      console.error('[webhook] Signature verification failed:', msg);
      return res.status(400).json({ error: `Webhook Error: ${msg}` });
    }

    try {
      switch (event.type) {
        case 'invoice.paid': {
          const stripeInvoice = event.data.object as Stripe.Invoice;

          // Look up the local invoice by Stripe invoice ID (cross-firm query
          // runs as superuser since we don't know the firm yet).
          const [inv] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.stripe_invoice_id, stripeInvoice.id))
            .limit(1);

          if (inv) {
            await withFirmContext(inv.firm_id, async (tx) => {
              await tx
                .update(invoices)
                .set({ status: 'paid', paid_at: new Date() })
                .where(eq(invoices.id, inv.id));

              await tx.insert(trustLedger).values({
                firm_id: inv.firm_id,
                applicant_id: inv.applicant_id,
                amount_cents: stripeInvoice.amount_paid,
                entry_type: 'deposit',
                related_invoice_id: inv.id,
                related_stripe_charge_id:
                  typeof stripeInvoice.charge === 'string'
                    ? stripeInvoice.charge
                    : (stripeInvoice.charge?.id ?? null),
                description: `Payment received via Stripe for invoice ${inv.id}`,
                reconciled: false,
              });
            });
          }
          break;
        }

        case 'payment_intent.succeeded': {
          // invoice.paid handles the authoritative update; this is a no-op
          // placeholder retained so additional logic can be added later.
          break;
        }

        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          // Cross-firm update — runs as superuser (no RLS on firmStripeAccounts
          // lookup by stripe_account_id needed here since we're the superuser).
          await db
            .update(firmStripeAccounts)
            .set({
              charges_enabled: account.charges_enabled ?? false,
              onboarding_status: account.charges_enabled ? 'complete' : 'pending',
            })
            .where(eq(firmStripeAccounts.stripe_account_id, account.id));
          break;
        }

        default:
          // Unhandled event type — acknowledge receipt so Stripe stops retrying.
          break;
      }

      res.json({ received: true, type: event.type });
    } catch (err) {
      console.error('[webhook] Handler error:', err);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  },
);
