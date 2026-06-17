/**
 * Integration tests: Case / Matter Management service + RLS isolation.
 *
 * Requires a running Postgres with migrations applied (pnpm db:migrate).
 * Runs against the real DB — no mocks. RLS is enforced via withFirmContext.
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, sql as pgClient, withFirmContext } from '../../../db/postgres';
import { firms } from '../../../db/schema/firms';
import { users } from '../../../db/schema/users';
import { applicants } from '../../../db/schema/applicants';
import { cases } from '../../../db/schema/cases';
import { caseEvents } from '../../../db/schema/case_events';
import {
  listCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  listCaseEvents,
} from '../cases.service';

// ---------------------------------------------------------------------------
// Shared test state
// ---------------------------------------------------------------------------
let firmAId: string;
let firmBId: string;
let actorAId: string;
let actorBId: string;
let applicantAId: string;
let applicantBId: string;

beforeAll(async () => {
  const tag = Date.now();

  // Create two isolated firms
  const [firmA] = await db
    .insert(firms)
    .values({ name: 'Cases Test Firm A', slug: `cases-test-a-${tag}` })
    .returning();
  firmAId = firmA.id;

  const [firmB] = await db
    .insert(firms)
    .values({ name: 'Cases Test Firm B', slug: `cases-test-b-${tag}` })
    .returning();
  firmBId = firmB.id;

  // Create staff users for both firms (actor_id for events)
  const [userA] = await withFirmContext(firmAId, (tx) =>
    tx
      .insert(users)
      .values({
        firm_id: firmAId,
        email: `staff-a-${tag}@test.test`,
        password_hash: 'hash',
        role: 'admin',
      })
      .returning(),
  );
  actorAId = userA.id;

  const [userB] = await withFirmContext(firmBId, (tx) =>
    tx
      .insert(users)
      .values({
        firm_id: firmBId,
        email: `staff-b-${tag}@test.test`,
        password_hash: 'hash',
        role: 'admin',
      })
      .returning(),
  );
  actorBId = userB.id;

  // Create an applicant for Firm A
  const [appA] = await withFirmContext(firmAId, (tx) =>
    tx
      .insert(applicants)
      .values({
        firm_id: firmAId,
        email: `applicant-a-${tag}@test.test`,
        ai_key: `test-key-a-${tag}`,
        status: 'active',
        stage: 'lead',
      })
      .returning(),
  );
  applicantAId = appA.id;

  // Create an applicant for Firm B
  const [appB] = await withFirmContext(firmBId, (tx) =>
    tx
      .insert(applicants)
      .values({
        firm_id: firmBId,
        email: `applicant-b-${tag}@test.test`,
        ai_key: `test-key-b-${tag}`,
        status: 'active',
        stage: 'lead',
      })
      .returning(),
  );
  applicantBId = appB.id;
});

afterAll(async () => {
  // Cascade deletes all cases, case_events, applicants, users under these firms
  if (firmAId) await db.delete(firms).where(eq(firms.id, firmAId));
  if (firmBId) await db.delete(firms).where(eq(firms.id, firmBId));
  await pgClient.end();
});

// ---------------------------------------------------------------------------
// createCase
// ---------------------------------------------------------------------------
describe('createCase', () => {
  it('creates a case with correct firm_id and fields', async () => {
    const created = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'express_entry',
        title: 'Test EE Case',
        status: 'open',
      }),
    );

    expect(created.firm_id).toBe(firmAId);
    expect(created.applicant_id).toBe(applicantAId);
    expect(created.case_type).toBe('express_entry');
    expect(created.status).toBe('open');
    expect(created.title).toBe('Test EE Case');
  });

  it('generates a matter_number in ICRM-YYYY-NNNNN format', async () => {
    const created = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'study_permit',
        title: 'Matter Number Test',
        status: 'open',
      }),
    );

    expect(created.matter_number).toMatch(/^ICRM-\d{4}-\d{5}$/);
  });

  it('inserts a case_created event in case_events', async () => {
    const created = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'work_permit',
        title: 'Event Test Case',
        status: 'open',
      }),
    );

    const events = await withFirmContext(firmAId, (tx) =>
      listCaseEvents(tx as any, created.id),
    );

    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('case_created');
    expect(events[0].actor_id).toBe(actorAId);
    expect(events[0].case_id).toBe(created.id);
  });

  it('rejects invalid case_type with a ZodError', async () => {
    await expect(
      withFirmContext(firmAId, (tx) =>
        createCase(tx as any, firmAId, actorAId, {
          applicant_id: applicantAId,
          case_type: 'invalid_type' as any,
          title: 'Bad Type',
          status: 'open',
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects missing title with a ZodError', async () => {
    await expect(
      withFirmContext(firmAId, (tx) =>
        createCase(tx as any, firmAId, actorAId, {
          applicant_id: applicantAId,
          case_type: 'pgwp',
          title: '',
          status: 'open',
        }),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// listCases
// ---------------------------------------------------------------------------
describe('listCases', () => {
  it('returns only cases belonging to the requesting firm (RLS)', async () => {
    // Create a case for Firm B
    await withFirmContext(firmBId, (tx) =>
      createCase(tx as any, firmBId, actorBId, {
        applicant_id: applicantBId,
        case_type: 'visitor_visa',
        title: 'Firm B Case — should not be visible to A',
        status: 'open',
      }),
    );

    // List as Firm A — must NOT see Firm B's case
    const rows = await withFirmContext(firmAId, (tx) => listCases(tx as any));
    const firmBCases = rows.filter((c) => c.firm_id === firmBId);
    expect(firmBCases).toHaveLength(0);
  });

  it('filters by case_type', async () => {
    await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'citizenship',
        title: 'Citizenship Filter Test',
        status: 'open',
      }),
    );

    const rows = await withFirmContext(firmAId, (tx) =>
      listCases(tx as any, { case_type: 'citizenship', limit: 50, offset: 0 }),
    );

    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((c) => expect(c.case_type).toBe('citizenship'));
  });

  it('filters by status', async () => {
    await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'pnp',
        title: 'Closed PNP Case',
        status: 'closed',
      }),
    );

    const rows = await withFirmContext(firmAId, (tx) =>
      listCases(tx as any, { status: 'closed', limit: 50, offset: 0 }),
    );

    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((c) => expect(c.status).toBe('closed'));
  });

  it('respects limit and offset', async () => {
    const page1 = await withFirmContext(firmAId, (tx) =>
      listCases(tx as any, { limit: 2, offset: 0 }),
    );
    const page2 = await withFirmContext(firmAId, (tx) =>
      listCases(tx as any, { limit: 2, offset: 2 }),
    );

    expect(page1.length).toBeLessThanOrEqual(2);
    if (page1.length > 0 && page2.length > 0) {
      expect(page1[0].id).not.toBe(page2[0].id);
    }
  });
});

// ---------------------------------------------------------------------------
// getCaseById
// ---------------------------------------------------------------------------
describe('getCaseById', () => {
  it('returns the case when it belongs to the firm', async () => {
    const created = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'lmia',
        title: 'GetById Test',
        status: 'open',
      }),
    );

    const found = await withFirmContext(firmAId, (tx) =>
      getCaseById(tx as any, created.id),
    );

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('returns null when case belongs to a different firm (RLS isolation)', async () => {
    const createdInA = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'hc',
        title: 'Cross-Firm Isolation Test',
        status: 'open',
      }),
    );

    // Firm B tries to read Firm A's case — RLS blocks it
    const result = await withFirmContext(firmBId, (tx) =>
      getCaseById(tx as any, createdInA.id),
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateCase
// ---------------------------------------------------------------------------
describe('updateCase', () => {
  it('updates case fields', async () => {
    const created = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'refugee_asylum',
        title: 'Update Test',
        status: 'open',
      }),
    );

    const updated = await withFirmContext(firmAId, (tx) =>
      updateCase(tx as any, created.id, firmAId, actorAId, { title: 'Updated Title' }),
    );

    expect(updated.title).toBe('Updated Title');
  });

  it('inserts a status_changed event when status changes', async () => {
    const created = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'family_sponsorship',
        title: 'Status Event Test',
        status: 'open',
      }),
    );

    await withFirmContext(firmAId, (tx) =>
      updateCase(tx as any, created.id, firmAId, actorAId, { status: 'in_progress' }),
    );

    const events = await withFirmContext(firmAId, (tx) =>
      listCaseEvents(tx as any, created.id),
    );

    const statusEvent = events.find((e) => e.event_type === 'status_changed');
    expect(statusEvent).toBeDefined();
    expect((statusEvent!.old_value as any).status).toBe('open');
    expect((statusEvent!.new_value as any).status).toBe('in_progress');
  });

  it('does NOT insert events when no tracked fields change', async () => {
    const created = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'pgwp',
        title: 'No-Event Test',
        status: 'open',
      }),
    );

    const eventsBefore = await withFirmContext(firmAId, (tx) =>
      listCaseEvents(tx as any, created.id),
    );

    // Only update title — not a tracked event field
    await withFirmContext(firmAId, (tx) =>
      updateCase(tx as any, created.id, firmAId, actorAId, { title: 'New Title Only' }),
    );

    const eventsAfter = await withFirmContext(firmAId, (tx) =>
      listCaseEvents(tx as any, created.id),
    );

    expect(eventsAfter).toHaveLength(eventsBefore.length);
  });
});

// ---------------------------------------------------------------------------
// deleteCase
// ---------------------------------------------------------------------------
describe('deleteCase', () => {
  it('deletes the case and cascades to case_events', async () => {
    const created = await withFirmContext(firmAId, (tx) =>
      createCase(tx as any, firmAId, actorAId, {
        applicant_id: applicantAId,
        case_type: 'express_entry',
        title: 'Delete Me',
        status: 'open',
      }),
    );

    await withFirmContext(firmAId, (tx) =>
      deleteCase(tx as any, created.id),
    );

    const found = await withFirmContext(firmAId, (tx) =>
      getCaseById(tx as any, created.id),
    );
    expect(found).toBeNull();

    // case_events cascade — verify directly (superuser, no RLS)
    const orphanEvents = await db
      .select()
      .from(caseEvents)
      .where(eq(caseEvents.case_id, created.id));
    expect(orphanEvents).toHaveLength(0);
  });

  it('throws 404 when case does not exist', async () => {
    await expect(
      withFirmContext(firmAId, (tx) =>
        deleteCase(tx as any, '00000000-0000-0000-0000-000000000000'),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ---------------------------------------------------------------------------
// RLS isolation summary
// ---------------------------------------------------------------------------
describe('RLS: Firm A cannot access Firm B cases', () => {
  it('listCases as Firm A never returns Firm B records', async () => {
    const rows = await withFirmContext(firmAId, (tx) => listCases(tx as any));
    rows.forEach((c) => expect(c.firm_id).toBe(firmAId));
  });

  it('listCases as Firm B never returns Firm A records', async () => {
    const rows = await withFirmContext(firmBId, (tx) => listCases(tx as any));
    rows.forEach((c) => expect(c.firm_id).toBe(firmBId));
  });
});
