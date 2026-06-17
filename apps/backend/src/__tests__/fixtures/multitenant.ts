/**
 * Multi-tenant test fixtures.
 *
 * Usage:
 *   const fixture = await provisionTwoFirmsWithData();
 *   // ... run tests ...
 *   await teardownFirms(fixture.firmA.id, fixture.firmB.id);
 *
 * Adding a new Postgres-backed model to the fixtures:
 *   1. Import the table from ../../db/schema/<table>.ts
 *   2. Call seedInFirm() for each firm inside provisionTwoFirmsWithData().
 *   3. Return the seeded rows in the fixture object.
 *   4. Add a cross-tenant test in cross-tenant.test.ts.
 */
import jwt from 'jsonwebtoken';
import { inArray } from 'drizzle-orm';
import { db, withFirmContext } from '../../db/postgres';
import { firms, type Firm } from '../../db/schema/firms';
import { users, type User } from '../../db/schema/users';
import { createApplicant } from '../../modules/applicants/applicants.service';
import type { Applicant } from '../../db/schema/applicants';
import { documents, type Document } from '../../db/schema/documents';
import { tasks, type Task } from '../../db/schema/tasks';
import { notifications, type Notification } from '../../db/schema/notifications';

// ---------------------------------------------------------------------------
// JWT helper
// ---------------------------------------------------------------------------
function issueJwt(firmId: string, userId: string, role = 'admin'): string {
  const secret =
    process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'test-secret';
  return jwt.sign({ firm_id: firmId, user_id: userId, role }, secret, {
    expiresIn: '1h',
  });
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export interface TwoFirmFixture {
  firmA: Firm;
  firmB: Firm;
  userA: User;
  userB: User;
  applicantA: Applicant;
  applicantB: Applicant;
  /** One seeded document for applicantA — no real S3 object, just DB metadata. */
  documentA: Document;
  /** One seeded document for applicantB. */
  documentB: Document;
  /** One seeded task for firmA. */
  taskA: Task;
  /** One seeded task for firmB. */
  taskB: Task;
  /** One seeded notification for userA. */
  notificationA: Notification;
  /** One seeded notification for userB. */
  notificationB: Notification;
  jwtA: string;
  jwtB: string;
}

// ---------------------------------------------------------------------------
// provisionTwoFirmsWithData
// ---------------------------------------------------------------------------
/**
 * Creates two firms in Postgres, seeds one admin user in each, and returns
 * signed JWTs for both.  Call teardownFirms() in afterAll to clean up.
 *
 * To seed additional Postgres-backed models, call seedInFirm() here and
 * extend the TwoFirmFixture type.
 */
export async function provisionTwoFirmsWithData(): Promise<TwoFirmFixture> {
  const tag = Date.now();

  const [firmA] = await db
    .insert(firms)
    .values({ name: `CT Firm A ${tag}`, slug: `ct-a-${tag}` })
    .returning();

  const [firmB] = await db
    .insert(firms)
    .values({ name: `CT Firm B ${tag}`, slug: `ct-b-${tag}` })
    .returning();

  const userA = await seedInFirm(firmA.id, (tx) =>
    tx
      .insert(users)
      .values({
        firm_id: firmA.id,
        email: `admin-a-${tag}@ct.test`,
        password_hash: 'hash',
        role: 'admin',
      })
      .returning()
      .then((r) => r[0]),
  );

  const userB = await seedInFirm(firmB.id, (tx) =>
    tx
      .insert(users)
      .values({
        firm_id: firmB.id,
        email: `admin-b-${tag}@ct.test`,
        password_hash: 'hash',
        role: 'admin',
      })
      .returning()
      .then((r) => r[0]),
  );

  const applicantA = await seedInFirm(firmA.id, (tx) =>
    createApplicant(tx as typeof db, firmA.id, {
      email: `applicant-a-${tag}@ct.test`,
      first_name: 'Applicant',
      last_name: 'Alpha',
    }),
  );

  const applicantB = await seedInFirm(firmB.id, (tx) =>
    createApplicant(tx as typeof db, firmB.id, {
      email: `applicant-b-${tag}@ct.test`,
      first_name: 'Applicant',
      last_name: 'Beta',
    }),
  );

  // Seed one document per firm (DB-only, no real S3 object needed for RLS tests).
  const documentA = await seedInFirm(firmA.id, (tx) =>
    tx
      .insert(documents)
      .values({
        firm_id: firmA.id,
        applicant_id: applicantA.id,
        document_type: 'passport',
        s3_key: `${applicantA.ai_key}/documents/passport/test-a.pdf`,
        s3_bucket: 'test-bucket',
        mime_type: 'application/pdf',
        size_bytes: 102_400,
      })
      .returning()
      .then((r) => r[0]),
  );

  const documentB = await seedInFirm(firmB.id, (tx) =>
    tx
      .insert(documents)
      .values({
        firm_id: firmB.id,
        applicant_id: applicantB.id,
        document_type: 'passport',
        s3_key: `${applicantB.ai_key}/documents/passport/test-b.pdf`,
        s3_bucket: 'test-bucket',
        mime_type: 'application/pdf',
        size_bytes: 98_304,
      })
      .returning()
      .then((r) => r[0]),
  );

  const taskA = await seedInFirm(firmA.id, (tx) =>
    tx
      .insert(tasks)
      .values({
        firm_id: firmA.id,
        applicant_id: applicantA.id,
        task_type: 'general',
        title: `CT Task A ${tag}`,
        status: 'open',
      })
      .returning()
      .then((r) => r[0]),
  );

  const taskB = await seedInFirm(firmB.id, (tx) =>
    tx
      .insert(tasks)
      .values({
        firm_id: firmB.id,
        applicant_id: applicantB.id,
        task_type: 'general',
        title: `CT Task B ${tag}`,
        status: 'open',
      })
      .returning()
      .then((r) => r[0]),
  );

  const notificationA = await seedInFirm(firmA.id, (tx) =>
    tx
      .insert(notifications)
      .values({
        firm_id: firmA.id,
        user_id: userA.id,
        type: 'task.assigned',
        title: `CT Notification A ${tag}`,
        body: 'You have a new task.',
      })
      .returning()
      .then((r) => r[0]),
  );

  const notificationB = await seedInFirm(firmB.id, (tx) =>
    tx
      .insert(notifications)
      .values({
        firm_id: firmB.id,
        user_id: userB.id,
        type: 'task.assigned',
        title: `CT Notification B ${tag}`,
        body: 'You have a new task.',
      })
      .returning()
      .then((r) => r[0]),
  );

  return {
    firmA,
    firmB,
    userA,
    userB,
    applicantA,
    applicantB,
    documentA,
    documentB,
    taskA,
    taskB,
    notificationA,
    notificationB,
    jwtA: issueJwt(firmA.id, userA.id),
    jwtB: issueJwt(firmB.id, userB.id),
  };
}

// ---------------------------------------------------------------------------
// seedInFirm — generic helper for seeding any Postgres-backed model
// ---------------------------------------------------------------------------
/**
 * Runs `fn` inside a firm-scoped transaction (withFirmContext), returning
 * whatever `fn` returns.
 *
 * Example — seed 3 users in a firm:
 *
 *   const rows = await Promise.all(
 *     Array.from({ length: 3 }, (_, i) =>
 *       seedInFirm(firmId, (tx) =>
 *         tx.insert(users).values({ firm_id: firmId, email: `u${i}@t.com`, ... })
 *           .returning().then(r => r[0])
 *       )
 *     )
 *   );
 */
export async function seedInFirm<T>(
  firmId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return withFirmContext(firmId, fn);
}

// ---------------------------------------------------------------------------
// teardownFirms — cascades to all child rows via FK
// ---------------------------------------------------------------------------
export async function teardownFirms(...firmIds: string[]): Promise<void> {
  if (firmIds.length === 0) return;
  await db.delete(firms).where(inArray(firms.id, firmIds));
}
