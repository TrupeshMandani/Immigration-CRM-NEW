import { Router, Request, Response } from 'express';
import {
  listForUser,
  markAsRead,
  markAllRead,
  send,
} from './notifications.service';

export const notificationsRouter = Router();

function svcError(res: Response, err: unknown) {
  const e = err as { statusCode?: number; message?: string };
  return res
    .status(e.statusCode ?? 500)
    .json({ success: false, message: e.message ?? 'Internal error' });
}

// ---------------------------------------------------------------------------
// GET /api/notifications
// Query: status (UNREAD|READ|ALL), page, limit
// ---------------------------------------------------------------------------
notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.context!.userId;
    const { status = 'UNREAD', page, limit } = req.query as Record<string, string>;
    const unreadOnly = status.toUpperCase() !== 'ALL' && status.toUpperCase() !== 'READ';

    const result = await listForUser(req.db, userId, {
      unreadOnly: status.toUpperCase() === 'UNREAD',
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/notifications/:id/read
// ---------------------------------------------------------------------------
notificationsRouter.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.context!.userId;
    const id = req.params.id as string;
    const row = await markAsRead(req.db, id, userId);
    res.json({ success: true, notification: row });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/notifications/read-all
// ---------------------------------------------------------------------------
notificationsRouter.post('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.context!.userId;
    const result = await markAllRead(req.db, userId);
    res.json({ success: true, updated: result.updated });
  } catch (err) {
    svcError(res, err);
  }
});
