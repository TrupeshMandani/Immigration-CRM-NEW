import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { firms } from './firms';

export const firmStripeAccounts = pgTable('firm_stripe_accounts', {
  firm_id: text('firm_id')
    .primaryKey()
    .references(() => firms.id, { onDelete: 'cascade' }),
  stripe_account_id: text('stripe_account_id').notNull().unique(),
  operating_account_id: text('operating_account_id'),
  trust_account_id: text('trust_account_id'),
  onboarding_status: text('onboarding_status').notNull().default('pending'),
  charges_enabled: boolean('charges_enabled').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type FirmStripeAccount = typeof firmStripeAccounts.$inferSelect;
export type NewFirmStripeAccount = typeof firmStripeAccounts.$inferInsert;
