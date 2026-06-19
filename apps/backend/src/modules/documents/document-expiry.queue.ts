import { Queue } from 'bullmq';

function redisOpts() {
  const raw = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: Number(u.port) || 6379,
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
  };
}

export const documentExpiryQueue = new Queue('document-expiry-check', {
  connection: redisOpts(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/** Schedule the daily expiry scan at 09:00 UTC (idempotent). */
export async function scheduleExpiryScan() {
  await documentExpiryQueue.add(
    'daily-expiry-scan',
    {},
    {
      repeat: { pattern: '0 9 * * *' },
      jobId: 'document-expiry-daily-scan',
    },
  );
}
