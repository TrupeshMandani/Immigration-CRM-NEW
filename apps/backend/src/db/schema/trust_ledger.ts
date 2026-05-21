import { pgTable, text, integer, boolean, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { applicants } from './applicants';
import { users } from './users';
import { invoices } from './invoices';

export const trustLedger = pgTable(
  'trust_ledger',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    applicant_id: text('applicant_id').references(() => applicants.id, { onDelete: 'set null' }),
    amount_cents: integer('amount_cents').notNull(),
    entry_type: text('entry_type').notNull(),
    related_invoice_id: text('related_invoice_id').references(() => invoices.id, {
      onDelete: 'set null',
    }),
    related_stripe_charge_id: text('related_stripe_charge_id'),
    description: text('description'),
    recorded_by: text('recorded_by').references(() => users.id, { onDelete: 'set null' }),
    reconciled: boolean('reconciled').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      'trust_ledger_entry_type_check',
      sql`entry_type IN ('deposit','withdrawal','transfer_to_operating','refund')`,
    ),
  ],
);

export type TrustLedgerEntry = typeof trustLedger.$inferSelect;
export type NewTrustLedgerEntry = typeof trustLedger.$inferInsert;
