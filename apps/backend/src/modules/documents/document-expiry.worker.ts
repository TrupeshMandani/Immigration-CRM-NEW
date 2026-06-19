import { Worker } from 'bullmq';
import { db } from '../../db/postgres';
import { applicants } from '../../db/schema/applicants';
import { ne } from 'drizzle-orm';

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

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function parseExpiryFromProfile(profileData: Record<string, unknown>): string | null {
  const candidates = [
    profileData.ExpiryDate,
    profileData.expiryDate,
    (profileData.passportDetails as any)?.expiryDate,
  ];
  for (const v of candidates) {
    if (v && typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) {
      return v.slice(0, 10);
    }
  }
  return null;
}

export function startDocumentExpiryWorker() {
  const worker = new Worker(
    'document-expiry-check',
    async (job) => {
      if (job.name !== 'daily-expiry-scan') return;

      // Load all non-closed applicants that have profile_data
      const rows = await db
        .select({
          id: applicants.id,
          firm_id: applicants.firm_id,
          first_name: applicants.first_name,
          last_name: applicants.last_name,
          profile_data: applicants.profile_data,
        })
        .from(applicants)
        .where(ne(applicants.status, 'closed'));

      let notified = 0;

      for (const row of rows) {
        const profile = (row.profile_data ?? {}) as Record<string, unknown>;
        const expiryDate = parseExpiryFromProfile(profile);
        if (!expiryDate) continue;

        const days = daysUntil(expiryDate);
        if (days > 180) continue; // only warn within 6 months

        try {
          const { emitToUser } = await import('../../socket/index.js');
          emitToUser(row.firm_id, row.id, 'document:expiring', {
            documentType: 'Passport',
            expiryDate,
            daysRemaining: days,
          });
          notified++;
        } catch {
          // socket not initialized or applicant not connected — skip silently
        }
      }

      console.log(
        `[document-expiry-worker] Daily scan — checked: ${rows.length}, notified: ${notified}`,
      );
      return { checked: rows.length, notified };
    },
    { connection: redisOpts(), concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[document-expiry-worker] job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[document-expiry-worker] worker error:', err.message);
  });

  return worker;
}
