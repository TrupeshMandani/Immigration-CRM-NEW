import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { users } from './users';

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  firm_id: text('firm_id')
    .notNull()
    .references(() => firms.id, { onDelete: 'cascade' }),
  // Recipient — nullable so system-wide notifications (billing.paid) can target all firm users
  user_id: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  // Dot-namespaced type: document.uploaded | task.assigned | ai.verified | billing.paid | etc.
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  payload: jsonb('payload').default(sql`'{}'::jsonb`),
  // Null = unread; set to timestamp when user reads it
  read_at: timestamp('read_at', { withTimezone: true }),
  // Which channels this notification has been delivered through
  delivered_via: text('delivered_via').array().default(sql`ARRAY[]::TEXT[]`),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
