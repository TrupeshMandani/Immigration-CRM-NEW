import { Queue } from 'bullmq';

export interface VerifyJobData {
  documentId: string;
  firmId: string;
  applicantId: string | null;
  s3Key: string;
  s3Bucket: string;
  documentType: string;
  mimeType: string;
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

export const verifyQueue = new Queue<VerifyJobData>('ai-verify', {
  connection: redisOpts(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});
