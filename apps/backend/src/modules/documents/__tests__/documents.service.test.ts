/**
 * documents.service integration + mocked-S3 unit tests.
 *
 * Real Postgres DB is used for all persistence operations.
 * S3 calls are intercepted by aws-sdk-client-mock so no AWS credentials
 * are required, and no real files are uploaded.
 * getSignedUrl from @aws-sdk/s3-request-presigner is mocked via vi.mock.
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { eq } from 'drizzle-orm';
import { db, withFirmContext } from '../../../db/postgres';
import { firms } from '../../../db/schema/firms';
import { documents } from '../../../db/schema/documents';
import { createApplicant } from '../../applicants/applicants.service';

// ---------------------------------------------------------------------------
// Mock presigned URL generation — doesn't actually call AWS.
// ---------------------------------------------------------------------------
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://mocked-presigned-url.test/upload'),
}));

// ---------------------------------------------------------------------------
// Mock S3Client.send() calls.
// ---------------------------------------------------------------------------
const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
});

// ---------------------------------------------------------------------------
// Import the service AFTER mocks are set up.
// ---------------------------------------------------------------------------
import {
  generateUploadUrl,
  finalizeUpload,
  getDownloadUrl,
  listApplicantDocuments,
  deleteDocument,
} from '../documents.service';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const tag = Date.now();
let firmId: string;
let applicantId: string;

beforeAll(async () => {
  const [firm] = await db
    .insert(firms)
    .values({ name: `Doc Test Firm ${tag}`, slug: `doc-test-${tag}` })
    .returning();
  firmId = firm.id;

  const applicant = await withFirmContext(firmId, (tx) =>
    createApplicant(tx as typeof db, firmId, {
      email: `doc-applicant-${tag}@test.com`,
      first_name: 'Doc',
      last_name: 'Tester',
    }),
  );
  applicantId = applicant.id;
});

afterAll(async () => {
  await db.delete(firms).where(eq(firms.id, firmId));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('documents service', () => {
  let documentId: string;
  let docS3Key: string;

  it('generateUploadUrl — creates DB row and returns presigned URL', async () => {
    const result = await withFirmContext(firmId, (tx) =>
      generateUploadUrl(tx as typeof db, firmId, null, {
        applicantId,
        documentType: 'passport',
        fileName: 'passport.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512_000, // 500 KB — below threshold
      }),
    );

    expect(result.uploadUrl).toBe('https://mocked-presigned-url.test/upload');
    expect(result.documentId).toBeTruthy();
    expect(result.s3Key).toContain('/documents/passport/');
    expect(result.s3Key).toContain('passport.pdf');

    documentId = result.documentId;
    docS3Key = result.s3Key;
  });

  it('generateUploadUrl — rejects unknown applicantId', async () => {
    await expect(
      withFirmContext(firmId, (tx) =>
        generateUploadUrl(tx as typeof db, firmId, null, {
          applicantId: '00000000-0000-0000-0000-000000000000',
          documentType: 'passport',
          fileName: 'x.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        }),
      ),
    ).rejects.toThrow('Applicant not found');
  });

  it('generateUploadUrl — Zod rejects invalid sizeBytes', async () => {
    await expect(
      withFirmContext(firmId, (tx) =>
        generateUploadUrl(tx as typeof db, firmId, null, {
          applicantId,
          documentType: 'passport',
          fileName: 'x.pdf',
          mimeType: 'application/pdf',
          sizeBytes: -1,
        }),
      ),
    ).rejects.toThrow();
  });

  it('finalizeUpload — hashes small file and updates row', async () => {
    // Mock HeadObject: file exists
    s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 512_000 });

    // Mock GetObject: return deterministic content
    const content = Buffer.from('fake passport pdf content');
    s3Mock.on(GetObjectCommand).resolves({
      Body: Readable.from([content]) as any,
    });

    const result = await withFirmContext(firmId, (tx) =>
      finalizeUpload(tx as typeof db, documentId, firmId),
    );

    // Should be a finalized document row (not 'hashing_queued')
    expect('file_hash' in result).toBe(true);
    const doc = result as typeof documents.$inferSelect;
    expect(doc.file_hash).toBeTruthy();
    expect(typeof doc.file_hash).toBe('string');
    expect(doc.file_hash!.length).toBe(64); // SHA-256 hex
  });

  it('finalizeUpload — 422 when S3 file not found', async () => {
    // Create a fresh doc row with a key that doesn't exist in S3
    const { documentId: newId } = await withFirmContext(firmId, (tx) =>
      generateUploadUrl(tx as typeof db, firmId, null, {
        applicantId,
        documentType: 'ielts',
        fileName: 'ielts.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 200_000,
      }),
    );

    const notFound = Object.assign(new Error('NotFound'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });
    s3Mock.on(HeadObjectCommand).rejects(notFound);

    await expect(
      withFirmContext(firmId, (tx) =>
        finalizeUpload(tx as typeof db, newId, firmId),
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('getDownloadUrl — returns mocked signed URL', async () => {
    const url = await withFirmContext(firmId, (tx) =>
      getDownloadUrl(tx as typeof db, documentId),
    );
    expect(typeof url).toBe('string');
    expect(url).toBeTruthy();
  });

  it('listApplicantDocuments — returns documents for the applicant', async () => {
    const rows = await withFirmContext(firmId, (tx) =>
      listApplicantDocuments(tx as typeof db, applicantId),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.applicant_id).toBe(applicantId);
      expect(r.firm_id).toBe(firmId);
    }
  });

  it('deleteDocument — removes the row', async () => {
    // Seed a throwaway row
    const { documentId: tmpId } = await withFirmContext(firmId, (tx) =>
      generateUploadUrl(tx as typeof db, firmId, null, {
        applicantId,
        documentType: 'photo',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 50_000,
      }),
    );

    await withFirmContext(firmId, (tx) =>
      deleteDocument(tx as typeof db, tmpId),
    );

    const remaining = await withFirmContext(firmId, (tx) =>
      listApplicantDocuments(tx as typeof db, applicantId),
    );
    expect(remaining.find((r) => r.id === tmpId)).toBeUndefined();
  });

  it('deleteDocument — throws 404 for unknown id', async () => {
    await expect(
      withFirmContext(firmId, (tx) =>
        deleteDocument(tx as typeof db, '00000000-0000-0000-0000-000000000000'),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
