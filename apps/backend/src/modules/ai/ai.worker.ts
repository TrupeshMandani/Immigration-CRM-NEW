import { Worker } from 'bullmq';
import { tmpdir } from 'os';
import { join } from 'path';
import { createWriteStream, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { withFirmContext } from '../../db/postgres';
import { documents } from '../../db/schema/documents';
import { applicants } from '../../db/schema/applicants';
import { s3 } from '../documents/documents.service';
import { verifyDocumentType } from './verification.service';
import { createAIVerificationTask } from '../tasks/tasks.service';
import type { VerifyJobData } from './verify.queue';

function redisOpts() {
  const raw = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: Number(u.port) || 6379,
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    maxRetriesPerRequest: null as null,
  };
}

async function downloadToTemp(bucket: string, key: string, ext: string): Promise<string> {
  const tmpPath = join(tmpdir(), `icrm-verify-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!Body) throw new Error('S3 GetObject returned empty body');
  await pipeline(Body as NodeJS.ReadableStream, createWriteStream(tmpPath));
  return tmpPath;
}

export function startVerifyWorker() {
  const worker = new Worker<VerifyJobData>(
    'ai-verify',
    async (job) => {
      const { documentId, firmId, applicantId, s3Key, s3Bucket, documentType, mimeType } = job.data;

      const ext = s3Key.split('.').pop() ?? 'bin';
      const tmpPath = await downloadToTemp(s3Bucket, s3Key, ext);

      try {
        const result = await verifyDocumentType(
          { expectedType: documentType, filePath: tmpPath, mimeType },
          { firmId, relatedEntityType: 'document', relatedEntityId: documentId },
        );

        await withFirmContext(firmId, (tx) =>
          tx
            .update(documents)
            .set({ ai_verification: result as unknown as Record<string, unknown> })
            .where(eq(documents.id, documentId)),
        );

        // Auto-create an ai_verification task for verdicts that need human review.
        // 'pending' = AI was uncertain; 'failed' = AI detected wrong doc type.
        if (result.status === 'pending' || result.status === 'failed') {
          // Look up applicant context so the task carries the AI key the frontend
          // needs to open the document (otherwise "File information missing").
          let applicantAiKey: string | null = null;
          let applicantName: string | null = null;
          if (applicantId) {
            const [appRow] = await withFirmContext(firmId, (tx) =>
              tx.select().from(applicants).where(eq(applicants.id, applicantId)).limit(1),
            );
            if (appRow) {
              applicantAiKey = appRow.ai_key ?? null;
              applicantName = [appRow.first_name, appRow.last_name].filter(Boolean).join(' ').trim() || null;
            }
          }

          await createAIVerificationTask(
            documentId,
            result,
            null, // aiJobId — traceability link; TODO: thread through from runAIJob
            {
              firmId,
              applicantId: applicantId ?? null,
              applicantAiKey,
              applicantName,
              documentField: documentType,
              // documentType is the document-type slug (documents.document_type),
              // which the files API expects as its :docId path param.
              documentSlug: documentType,
            },
          );
        }

        console.log(`[ai-worker] ${documentId} verified → ${result.status} (${result.confidence})`);
      } finally {
        try { unlinkSync(tmpPath); } catch { /* temp cleanup best-effort */ }
      }
    },
    { connection: redisOpts() },
  );

  worker.on('failed', (job, err) => {
    console.error(`[ai-worker] job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[ai-worker] worker error:', err.message);
  });

  return worker;
}
