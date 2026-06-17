import { Worker } from 'bullmq';
import { getDeadlinesForWorker } from './deadlines.service';
import { send as sendNotification } from '../notifications/notifications.service';

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

function daysUntil(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function startDeadlineWorker() {
  const worker = new Worker(
    'deadline-notifications',
    async (job) => {
      if (job.name !== 'daily-scan') return;

      const allDeadlines = await getDeadlinesForWorker();
      let notificationsSent = 0;

      for (const deadline of allDeadlines) {
        const d = daysUntil(deadline.due_date);

        // Check if today's offset matches a configured notification window, or is day-of
        const windowMatch =
          (deadline.days_before_notification as number[]).includes(d) || d === 0;
        if (!windowMatch) continue;

        const urgencyLabel = d < 0 ? 'OVERDUE' : d === 0 ? 'DUE TODAY' : `${d} days`;

        if (deadline.assigned_to) {
          await sendNotification(
            deadline.firm_id,
            deadline.assigned_to,
            'DEADLINE_REMINDER',
            `[${urgencyLabel}] ${deadline.label}`,
            `Due: ${deadline.due_date}. Please review and acknowledge.`,
            { deadlineId: deadline.id, caseId: deadline.case_id, daysUntil: d },
          ).catch(() => {});
          notificationsSent++;
        }
      }

      console.log(
        `[deadline-worker] Daily scan complete — checked: ${allDeadlines.length}, notified: ${notificationsSent}`,
      );
      return { processed: allDeadlines.length, notificationsSent };
    },
    { connection: redisOpts(), concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[deadline-worker] job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[deadline-worker] worker error:', err.message);
  });

  return worker;
}
