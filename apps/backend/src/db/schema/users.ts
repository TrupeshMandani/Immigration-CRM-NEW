import { pgTable, text, boolean, timestamp, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    password_hash: text('password_hash').notNull(),
    role: text('role').notNull(),
    first_name: text('first_name'),
    last_name: text('last_name'),
    rcic_number: text('rcic_number'),
    is_active: boolean('is_active').default(true),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('users_firm_email_unique').on(table.firm_id, table.email),
    check('users_role_check', sql`role IN ('admin','senior','junior','student')`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
