import { Router, type Request, type Response } from 'express';
import {
  listCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  listCaseEvents,
} from './cases.service';
import { listDeadlines } from '../deadlines/deadlines.service';
import { send as sendNotification } from '../notifications/notifications.service';

async function getSocketEmitters() {
  const socket = await import('../../socket/index.js');
  return { emitToFirm: socket.emitToFirm };
}

export const casesRouter = Router();

// Guard: applicants cannot access case management endpoints
casesRouter.use((req: Request, res: Response, next) => {
  if (req.context?.role === 'applicant') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

// ---------------------------------------------------------------------------
// GET /api/cases
// ---------------------------------------------------------------------------
casesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await listCases(req.db, req.query as any);
    res.json(rows);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// GET /api/cases/:id
// ---------------------------------------------------------------------------
casesRouter.get('/:id', async (req: Request, res: Response) => {
  const caseRecord = await getCaseById(req.db, String(req.params.id));
  if (!caseRecord) return res.status(404).json({ message: 'Case not found' });
  res.json(caseRecord);
});

// ---------------------------------------------------------------------------
// GET /api/cases/:id/events  (timeline)
// ---------------------------------------------------------------------------
casesRouter.get('/:id/events', async (req: Request, res: Response) => {
  const events = await listCaseEvents(req.db, String(req.params.id));
  res.json(events);
});

// ---------------------------------------------------------------------------
// GET /api/cases/:id/deadlines
// ---------------------------------------------------------------------------
casesRouter.get('/:id/deadlines', async (req: Request, res: Response) => {
  const rows = await listDeadlines(req.db, { case_id: String(req.params.id) });
  res.json(rows);
});

// ---------------------------------------------------------------------------
// POST /api/cases
// ---------------------------------------------------------------------------
casesRouter.post('/', async (req: Request, res: Response) => {
  const firmId  = req.context!.firmId;
  const actorId = req.context!.userId;
  try {
    const newCase = await createCase(req.db, firmId, actorId, req.body);

    // Notify assignee (fire-and-forget)
    if (newCase.assigned_to) {
      sendNotification(
        firmId,
        newCase.assigned_to,
        'CASE_ASSIGNED',
        'New case assigned to you',
        `Case ${newCase.matter_number}: ${newCase.title}`,
        { caseId: newCase.id },
      ).catch(() => {});
    }

    // Real-time update for firm dashboard
    getSocketEmitters()
      .then(({ emitToFirm }) => emitToFirm(firmId, 'case:created', newCase))
      .catch(() => {});

    res.status(201).json(newCase);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/cases/:id
// ---------------------------------------------------------------------------
casesRouter.patch('/:id', async (req: Request, res: Response) => {
  const firmId  = req.context!.firmId;
  const actorId = req.context!.userId;
  try {
    const updated = await updateCase(req.db, String(req.params.id), firmId, actorId, req.body);

    getSocketEmitters()
      .then(({ emitToFirm }) => emitToFirm(firmId, 'case:updated', updated))
      .catch(() => {});

    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ message: err.message });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/cases/:id  (admin only)
// ---------------------------------------------------------------------------
casesRouter.delete('/:id', async (req: Request, res: Response) => {
  if (req.context?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  try {
    await deleteCase(req.db, String(req.params.id));

    getSocketEmitters()
      .then(({ emitToFirm }) =>
        emitToFirm(req.context!.firmId, 'case:deleted', { id: req.params.id }),
      )
      .catch(() => {});

    res.json({ message: 'Case deleted' });
  } catch (err: any) {
    if (err.statusCode === 404) {
      return res.status(404).json({ message: err.message });
    }
    throw err;
  }
});
