/**
 * Integration tests for the applicants service layer.
 * Hits real Postgres with RLS enforced (icrm_app role via withFirmContext).
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, withFirmContext } from '../../../db/postgres';
import { firms } from '../../../db/schema/firms';
import {
  createApplicant,
  listApplicants,
  getApplicantById,
  updateApplicant,
  updateApplicantStage,
  deleteApplicant,
} from '../applicants.service';

let firmId: string;
const tag = Date.now();

beforeAll(async () => {
  const [firm] = await db
    .insert(firms)
    .values({ name: `Svc Test Firm ${tag}`, slug: `svc-test-${tag}` })
    .returning();
  firmId = firm.id;
});

afterAll(async () => {
  await db.delete(firms).where(eq(firms.id, firmId));
});

describe('applicants service', () => {
  let applicantId: string;

  it('createApplicant — inserts a row and returns it', async () => {
    const applicant = await withFirmContext(firmId, (tx) =>
      createApplicant(tx as typeof db, firmId, {
        email: `alice-${tag}@svc.test`,
        first_name: 'Alice',
        last_name: 'Smith',
        status: 'registered',
        stage: 'lead',
      }),
    );
    expect(applicant.id).toBeTruthy();
    expect(applicant.email).toBe(`alice-${tag}@svc.test`);
    expect(applicant.firm_id).toBe(firmId);
    expect(applicant.ai_key).toBeTruthy();
    applicantId = applicant.id;
  });

  it('createApplicant — rejects duplicate email within firm', async () => {
    await expect(
      withFirmContext(firmId, (tx) =>
        createApplicant(tx as typeof db, firmId, {
          email: `alice-${tag}@svc.test`, // same email
          first_name: 'Alice2',
        }),
      ),
    ).rejects.toThrow();
  });

  it('createApplicant — rejects invalid email', async () => {
    await expect(
      withFirmContext(firmId, (tx) =>
        createApplicant(tx as typeof db, firmId, { email: 'not-an-email' }),
      ),
    ).rejects.toThrow();
  });

  it('listApplicants — returns rows for current firm only (RLS)', async () => {
    const rows = await withFirmContext(firmId, (tx) =>
      listApplicants(tx as typeof db),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.firm_id).toBe(firmId);
    }
  });

  it('listApplicants — filters by status', async () => {
    const rows = await withFirmContext(firmId, (tx) =>
      listApplicants(tx as typeof db, { status: 'registered' }),
    );
    for (const r of rows) {
      expect(r.status).toBe('registered');
    }
  });

  it('getApplicantById — returns the correct applicant', async () => {
    const applicant = await withFirmContext(firmId, (tx) =>
      getApplicantById(tx as typeof db, applicantId),
    );
    expect(applicant).not.toBeNull();
    expect(applicant!.id).toBe(applicantId);
  });

  it('getApplicantById — returns null for unknown id', async () => {
    const applicant = await withFirmContext(firmId, (tx) =>
      getApplicantById(tx as typeof db, '00000000-0000-0000-0000-000000000000'),
    );
    expect(applicant).toBeNull();
  });

  it('updateApplicant — patches fields', async () => {
    const updated = await withFirmContext(firmId, (tx) =>
      updateApplicant(tx as typeof db, applicantId, {
        first_name: 'Alicia',
        status: 'active',
      }),
    );
    expect(updated.first_name).toBe('Alicia');
    expect(updated.status).toBe('active');
  });

  it('updateApplicantStage — changes stage', async () => {
    const updated = await withFirmContext(firmId, (tx) =>
      updateApplicantStage(tx as typeof db, applicantId, 'study_permit'),
    );
    expect(updated.stage).toBe('study_permit');
  });

  it('deleteApplicant — soft-closes the applicant', async () => {
    const closed = await withFirmContext(firmId, (tx) =>
      deleteApplicant(tx as typeof db, applicantId),
    );
    expect(closed.status).toBe('closed');

    // Row still exists — just closed
    const still = await withFirmContext(firmId, (tx) =>
      getApplicantById(tx as typeof db, applicantId),
    );
    expect(still).not.toBeNull();
    expect(still!.status).toBe('closed');
  });
});
