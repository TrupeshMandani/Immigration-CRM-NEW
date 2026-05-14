import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../../db/postgres';
import { firmStripeAccounts } from '../../db/schema/firm_stripe_accounts';

type DbClient = typeof db;

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-05-28.basil' as Stripe.LatestApiVersion });
}

// ─── createConnectAccount ─────────────────────────────────────────────────────
// Creates a Stripe Connect Custom account for the firm and persists it.
export async function createConnectAccount(
  dbClient: DbClient,
  firmId: string,
): Promise<{ accountId: string }> {
  const account = await stripe().accounts.create({
    type: 'custom',
    country: 'CA',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { firmId },
  });

  await dbClient
    .insert(firmStripeAccounts)
    .values({
      firm_id: firmId,
      stripe_account_id: account.id,
      onboarding_status: 'pending',
      charges_enabled: account.charges_enabled ?? false,
    })
    .onConflictDoUpdate({
      target: firmStripeAccounts.firm_id,
      set: {
        stripe_account_id: account.id,
        onboarding_status: 'pending',
        charges_enabled: account.charges_enabled ?? false,
      },
    });

  return { accountId: account.id };
}

// ─── createOperatingAndTrustAccounts ─────────────────────────────────────────
// Provisions two additional Stripe accounts: one for operating funds and one
// for client trust funds (required by immigration regulatory bodies).
export async function createOperatingAndTrustAccounts(
  dbClient: DbClient,
  firmId: string,
): Promise<{ operatingAccountId: string; trustAccountId: string }> {
  const s = stripe();

  const [operating, trust] = await Promise.all([
    s.accounts.create({
      type: 'custom',
      country: 'CA',
      metadata: { firmId, purpose: 'operating' },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    }),
    s.accounts.create({
      type: 'custom',
      country: 'CA',
      metadata: { firmId, purpose: 'trust' },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    }),
  ]);

  await dbClient
    .update(firmStripeAccounts)
    .set({
      operating_account_id: operating.id,
      trust_account_id: trust.id,
    })
    .where(eq(firmStripeAccounts.firm_id, firmId));

  return { operatingAccountId: operating.id, trustAccountId: trust.id };
}

// ─── getOnboardingLink ────────────────────────────────────────────────────────
export async function getOnboardingLink(
  dbClient: DbClient,
  firmId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<{ url: string }> {
  const [acct] = await dbClient
    .select()
    .from(firmStripeAccounts)
    .where(eq(firmStripeAccounts.firm_id, firmId))
    .limit(1);

  if (!acct) {
    throw Object.assign(new Error('No Stripe account found for firm — call createConnectAccount first'), { statusCode: 404 });
  }

  const link = await stripe().accountLinks.create({
    account: acct.stripe_account_id,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return { url: link.url };
}

// ─── syncAccountStatus ────────────────────────────────────────────────────────
// Called by the account.updated webhook to keep charges_enabled current.
export async function syncAccountStatus(
  dbClient: DbClient,
  stripeAccountId: string,
  chargesEnabled: boolean,
): Promise<void> {
  await dbClient
    .update(firmStripeAccounts)
    .set({ charges_enabled: chargesEnabled, onboarding_status: chargesEnabled ? 'complete' : 'pending' })
    .where(eq(firmStripeAccounts.stripe_account_id, stripeAccountId));
}
