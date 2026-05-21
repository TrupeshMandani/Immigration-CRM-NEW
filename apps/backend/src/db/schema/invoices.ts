import { pgTable, text, integer, jsonb, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { applicants } from './applicants';
import { cases } from './cases';
import { retainerAgreements } from './retainer_agreements';

export interface InvoiceLineItem {
  description: string;
  amount_cents: number;
  quantity?: number;
}

export const invoices = pgTable(
  'invoices',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    applicant_id: text('applicant_id')
      .notNull()
      .references(() => applicants.id, { onDelete: 'cascade' }),
    retainer_id: text('retainer_id').references(() => retainerAgreements.id, {
      onDelete: 'set null',
    }),
    amount_cents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('CAD'),
    status: text('status').notNull().default('draft'),
    stripe_invoice_id: text('stripe_invoice_id'),
    stripe_payment_intent_id: text('stripe_payment_intent_id'),
    issued_at: timestamp('issued_at', { withTimezone: true }),
    paid_at: timestamp('paid_at', { withTimezone: true }),
    due_at: timestamp('due_at', { withTimezone: true }),
    line_items: jsonb('line_items').$type<InvoiceLineItem[]>().notNull().default([]),
    case_id: text('case_id').references(() => cases.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      'invoices_status_check',
      sql`status IN ('draft','sent','paid','void','refunded')`,
    ),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
