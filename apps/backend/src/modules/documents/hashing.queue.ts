import { Queue } from 'bullmq';

export interface HashingJobData {
  documentId: string;
  firmId: string;
  s3Key: string;
  s3Bucket: string;
}

function redisOpts() {
  const raw = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: Number(u.port) || 6379,
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
  };
}

export const hashingQueue = new Queue<HashingJobData>('document-hashing', {
  connection: redisOpts(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});
