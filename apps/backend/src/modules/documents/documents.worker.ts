import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { withFirmContext } from '../../db/postgres';
import { documents } from '../../db/schema/documents';
import { computeS3Hash } from './documents.service';
import type { HashingJobData } from './hashing.queue';

function redisOpts() {
  const raw = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: Number(u.port) || 6379,
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    // BullMQ workers require maxRetriesPerRequest null to avoid timeout errors.
    maxRetriesPerRequest: null as null,
  };
}

export function startHashingWorker() {
  const worker = new Worker<HashingJobData>(
    'document-hashing',
    async (job) => {
      const { documentId, firmId, s3Key, s3Bucket } = job.data;

      const fileHash = await computeS3Hash(s3Bucket, s3Key);

      // Use withFirmContext so the update goes through RLS as icrm_app.
      await withFirmContext(firmId, (tx) =>
        tx
          .update(documents)
          .set({ file_hash: fileHash })
          .where(eq(documents.id, documentId)),
      );

      console.log(`[hashing-worker] ${documentId} → ${fileHash.slice(0, 12)}…`);
    },
    { connection: redisOpts() },
  );

  worker.on('failed', (job, err) => {
    console.error(`[hashing-worker] job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[hashing-worker] worker error:', err.message);
  });

  return worker;
}
