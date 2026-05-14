import { eq, isNull, desc, and, sql as drizzleSql } from 'drizzle-orm';
import { db, withFirmContext } from '../../db/postgres';
import {
  notifications,
  type Notification,
  type NewNotification,
} from '../../db/schema/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

type DbClient = typeof db;

export interface NotificationResponse {
  id: string;
  firm_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  delivered_via: string[];
  created_at: string;
  // Legacy-compat aliases (frontend reads these)
  isRead: boolean;
  createdAt: string;
}

export interface ListOptions {
  unreadOnly?: boolean;
  limit?: number;
  page?: number;
}

// ─── format ───────────────────────────────────────────────────────────────────

function formatNotification(row: Notification): NotificationResponse {
  return {
    id: row.id,
    firm_id: row.firm_id,
    user_id: row.user_id ?? null,
    type: row.type,
    title: row.title,
    body: row.body,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    read_at: row.read_at?.toISOString() ?? null,
    delivered_via: (row.delivered_via ?? []) as string[],
    created_at: row.created_at?.toISOString() ?? '',
    // Frontend compat
    isRead: row.read_at !== null,
    createdAt: row.created_at?.toISOString() ?? '',
  };
}

// ─── send ─────────────────────────────────────────────────────────────────────

/**
 * Create a notification, persist it to Postgres, and deliver it in real-time
 * via Socket.IO to the recipient's firm-scoped private channel.
 */
export async function send(
  firmId: string,
  userId: string,
  type: string,
  title: string,
  body: string,
  payload: Record<string, unknown> = {},
): Promise<Notification> {
  const [row] = await withFirmContext(firmId, (tx) =>
    tx
      .insert(notifications)
      .values({
        firm_id: firmId,
        user_id: userId,
        type,
        title,
        body,
        payload,
        delivered_via: ['in_app'],
      })
      .returning(),
  );

  // Real-time delivery via firm-scoped Socket.IO channel.
  // Lazy import (.js extension required by NodeNext resolution) avoids the
  // circular-dependency check while CJS module caching makes it safe at runtime.
  try {
    const { emitToUser } = await import('../../socket/index.js');
    emitToUser(firmId, userId, 'notification:new', formatNotification(row));
  } catch {
    // Socket not initialized (e.g. during tests) — skip silently
  }

  // TODO (Prompt 15): enqueue email job here when billing/email is wired up.
  // e.g. await emailQueue.add('send-notification-email', { notificationId: row.id });

  return row;
}

// ─── markAsRead ───────────────────────────────────────────────────────────────

export async function markAsRead(
  dbClient: DbClient,
  id: string,
  userId: string,
): Promise<Notification> {
  const [row] = await dbClient
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.user_id, userId),
      ),
    )
    .returning();

  if (!row) {
    throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
  }

  return row;
}

// ─── markAllRead ──────────────────────────────────────────────────────────────

export async function markAllRead(
  dbClient: DbClient,
  userId: string,
): Promise<{ updated: number }> {
  const result = await dbClient
    .update(notifications)
    .set({ read_at: new Date() })
    .where(
      and(
        eq(notifications.user_id, userId),
        isNull(notifications.read_at),
      ),
    )
    .returning({ id: notifications.id });

  return { updated: result.length };
}

// ─── listForUser ──────────────────────────────────────────────────────────────

export async function listForUser(
  dbClient: DbClient,
  userId: string,
  opts: ListOptions = {},
): Promise<{ notifications: NotificationResponse[]; meta: Record<string, unknown> }> {
  const { unreadOnly = false, limit: rawLimit = 20, page: rawPage = 1 } = opts;
  const perPage = Math.min(Math.max(Number(rawLimit) || 20, 1), 100);
  const currentPage = Math.max(Number(rawPage) || 1, 1);
  const offset = (currentPage - 1) * perPage;

  const conditions = [eq(notifications.user_id, userId)];
  if (unreadOnly) conditions.push(isNull(notifications.read_at));

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    dbClient
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.created_at))
      .offset(offset)
      .limit(perPage),
    dbClient
      .select({ total: drizzleSql<number>`count(*)::int` })
      .from(notifications)
      .where(where),
  ]);

  return {
    notifications: rows.map(formatNotification),
    meta: {
      total: total ?? 0,
      page: currentPage,
      limit: perPage,
      pages: Math.ceil((total ?? 0) / perPage) || 1,
    },
  };
}
