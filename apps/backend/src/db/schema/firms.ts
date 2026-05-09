import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const firms = pgTable('firms', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan_tier: text('plan_tier').default('starter'),
  settings: jsonb('settings').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Firm = typeof firms.$inferSelect;
export type NewFirm = typeof firms.$inferInsert;
