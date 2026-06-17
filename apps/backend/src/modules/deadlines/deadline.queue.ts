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

export const deadlineQueue = new Queue('deadline-notifications', {
  connection: redisOpts(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/** Schedule the daily scan at 08:00 UTC (idempotent — safe to call on every boot). */
export async function scheduleDeadlineScan() {
  await deadlineQueue.add(
    'daily-scan',
    {},
    {
      repeat:  { pattern: '0 8 * * *' },
      jobId:   'deadline-daily-scan',
    },
  );
}
