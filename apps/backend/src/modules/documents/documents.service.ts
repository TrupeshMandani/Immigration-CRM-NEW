import { createHash, randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../../db/postgres';
import { documents, type Document } from '../../db/schema/documents';
import { applicants } from '../../db/schema/applicants';
import { hashingQueue } from './hashing.queue';
import { verifyQueue } from '../ai/verify.queue';
import {
  GenerateUploadUrlSchema,
  type GenerateUploadUrlInput,
} from '@icrm/shared-types/documents';

// ---------------------------------------------------------------------------
// S3 client — exported so the worker can reuse it without creating a 2nd one.
// aws-sdk-client-mock patches S3Client.prototype.send, so tests intercept this.
// ---------------------------------------------------------------------------
export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET = () => process.env.AWS_S3_BUCKET_NAME ?? '';
const DOWNLOAD_TTL = () => parseInt(process.env.S3_PRESIGNED_URL_EXPIRY ?? '3600');
const UPLOAD_TTL = 900; // 15 min — long enough for slow connections
const LARGE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB threshold

type DbClient = typeof db;

// ---------------------------------------------------------------------------
// generateUploadUrl
// Returns a presigned S3 PUT URL the frontend uses to upload directly.
// A documents row is created immediately so the ID is stable before upload.
// ---------------------------------------------------------------------------
export async function generateUploadUrl(
  dbClient: DbClient,
  firmId: string,
  uploadedBy: string | null,
  input: GenerateUploadUrlInput,
): Promise<{ uploadUrl: string; documentId: string; s3Key: string; contentType: string }> {
  const parsed = GenerateUploadUrlSchema.parse(input);

  // Resolve the applicant's aiKey so the S3 key follows the existing convention.
  const [applicant] = await dbClient
    .select({ ai_key: applicants.ai_key })
    .from(applicants)
    .where(eq(applicants.id, parsed.applicantId))
    .limit(1);

  if (!applicant) {
    throw Object.assign(new Error('Applicant not found'), { statusCode: 404 });
  }

  const fileId = randomUUID();
  const sanitizedName = parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const typeSegment = parsed.documentType ?? 'general';
  const s3Key = `${applicant.ai_key}/documents/${typeSegment}/${fileId}-${sanitizedName}`;
  const bucket = BUCKET();

  const [doc] = await dbClient
    .insert(documents)
    .values({
      firm_id: firmId,
      applicant_id: parsed.applicantId,
      document_type: parsed.documentType,
      s3_key: s3Key,
      s3_bucket: bucket,
      mime_type: parsed.mimeType,
      size_bytes: parsed.sizeBytes,
      uploaded_by: uploadedBy,
      ai_verification: { name: parsed.fileName },
    })
    .returning();

  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: parsed.mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: UPLOAD_TTL });

  return { uploadUrl, documentId: doc.id, s3Key, contentType: parsed.mimeType };
}

// ---------------------------------------------------------------------------
// finalizeUpload
// Called by the frontend after the presigned PUT succeeds.
// Verifies the object exists in S3, then:
//   • small file (< 50 MB): streams and SHA-256 hashes inline → 200
//   • large file (≥ 50 MB): queues a BullMQ job             → 202
// ---------------------------------------------------------------------------
export async function finalizeUpload(
  dbClient: DbClient,
  documentId: string,
  firmId: string,
): Promise<Document | { status: 'hashing_queued'; documentId: string }> {
  const [doc] = await dbClient
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  if (!doc.s3_key || !doc.s3_bucket) {
    throw Object.assign(new Error('Document has no S3 location'), { statusCode: 400 });
  }

  // Confirm the file is actually in S3.
  try {
    await s3.send(new HeadObjectCommand({ Bucket: doc.s3_bucket, Key: doc.s3_key }));
  } catch (err: any) {
    const status = err.$metadata?.httpStatusCode ?? 0;
    if (err.name === 'NotFound' || status === 404) {
      throw Object.assign(
        new Error('File not found in S3 — the upload may have failed or timed out'),
        { statusCode: 422 },
      );
    }
    throw err;
  }

  // Queue AI verification for all documents (independent of hashing).
  await verifyQueue.add('verify', {
    documentId: doc.id,
    firmId,
    applicantId: doc.applicant_id,
    s3Key: doc.s3_key,
    s3Bucket: doc.s3_bucket,
    documentType: doc.document_type ?? 'Document',
    mimeType: doc.mime_type ?? 'application/octet-stream',
  });

  // Large file: hand off to background worker.
  if ((doc.size_bytes ?? 0) >= LARGE_FILE_BYTES) {
    await hashingQueue.add('hash', {
      documentId: doc.id,
      firmId,
      s3Key: doc.s3_key,
      s3Bucket: doc.s3_bucket,
    });
    return { status: 'hashing_queued', documentId: doc.id };
  }

  // Small file: hash inline.
  const fileHash = await computeS3Hash(doc.s3_bucket, doc.s3_key);

  const [updated] = await dbClient
    .update(documents)
    .set({ file_hash: fileHash })
    .where(eq(documents.id, documentId))
    .returning();

  return updated;
}

// ---------------------------------------------------------------------------
// getDownloadUrl
// Returns a short-lived presigned GET URL for the file.
// ---------------------------------------------------------------------------
export async function getDownloadUrl(
  dbClient: DbClient,
  documentId: string,
): Promise<string> {
  const [doc] = await dbClient
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  if (!doc.s3_key) throw Object.assign(new Error('Document has no S3 key'), { statusCode: 400 });

  const command = new GetObjectCommand({
    Bucket: doc.s3_bucket ?? BUCKET(),
    Key: doc.s3_key,
    ResponseContentDisposition: `inline; filename="${encodeURIComponent(doc.s3_key.split('/').pop() ?? 'file')}"`,
  });

  return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_TTL() });
}

// ---------------------------------------------------------------------------
// listApplicantDocuments
// Returns all documents for an applicant visible to the current firm (via RLS).
// ---------------------------------------------------------------------------
export async function listApplicantDocuments(
  dbClient: DbClient,
  applicantId: string,
): Promise<Document[]> {
  return dbClient
    .select()
    .from(documents)
    .where(eq(documents.applicant_id, applicantId))
    .orderBy(documents.created_at);
}

// ---------------------------------------------------------------------------
// deleteDocument
// Removes the row from Postgres.  S3 cleanup is handled separately (Prompt 12+).
// ---------------------------------------------------------------------------
export async function deleteDocument(
  dbClient: DbClient,
  documentId: string,
): Promise<void> {
  const result = await dbClient
    .delete(documents)
    .where(eq(documents.id, documentId))
    .returning({ id: documents.id });

  if (!result.length) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
}

// ---------------------------------------------------------------------------
// Internal: stream S3 object and compute SHA-256 hash.
// Exported for use by the background worker.
// ---------------------------------------------------------------------------
export async function computeS3Hash(bucket: string, key: string): Promise<string> {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!Body) throw new Error('S3 GetObject returned empty body');

  const hash = createHash('sha256');
  for await (const chunk of Body as AsyncIterable<Uint8Array>) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}
