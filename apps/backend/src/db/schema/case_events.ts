import { pgTable, text, jsonb, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { firms } from './firms';
import { cases } from './cases';
import { users } from './users';

export const caseEvents = pgTable(
  'case_events',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    firm_id: text('firm_id')
      .notNull()
      .references(() => firms.id, { onDelete: 'cascade' }),
    case_id: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    actor_id: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    event_type: text('event_type').notNull(),
    label: text('label').notNull(),
    old_value: jsonb('old_value'),
    new_value: jsonb('new_value'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      'case_events_event_type_check',
      sql`event_type IN ('case_created','status_changed','assignment_changed','document_added','task_added','note_added','metadata_updated','deadline_added','deadline_updated','deadline_acknowledged')`,
    ),
  ],
);

export type CaseEvent = typeof caseEvents.$inferSelect;
export type NewCaseEvent = typeof caseEvents.$inferInsert;
