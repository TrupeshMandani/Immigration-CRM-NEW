import { Router, type Request, type Response } from 'express';
import { withFirmContext } from '../../db/postgres';
import {
  listDeadlines,
  getDeadlineById,
  createDeadline,
  updateDeadline,
  deleteDeadline,
  acknowledgeDeadline,
  generateIcalFeed,
  getFirmByIcalToken,
} from './deadlines.service';

export const deadlinesRouter = Router();

// Guard: applicants cannot access deadline endpoints
deadlinesRouter.use((req: Request, res: Response, next) => {
  if (req.context?.role === 'applicant') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

// ---------------------------------------------------------------------------
// GET /api/deadlines
// ---------------------------------------------------------------------------
deadlinesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await listDeadlines(req.db, req.query as Record<string, unknown>);
    res.json(rows);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /api/deadlines
// ---------------------------------------------------------------------------
deadlinesRouter.post('/', async (req: Request, res: Response) => {
  const firmId  = req.context!.firmId;
  const actorId = req.context!.userId;
  try {
    const deadline = await createDeadline(req.db, firmId, actorId, req.body);
    res.status(201).json(deadline);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// GET /api/deadlines/:id
// ---------------------------------------------------------------------------
deadlinesRouter.get('/:id', async (req: Request, res: Response) => {
  const deadline = await getDeadlineById(req.db, String(req.params.id));
  if (!deadline) return res.status(404).json({ message: 'Deadline not found' });
  res.json(deadline);
});

// ---------------------------------------------------------------------------
// PATCH /api/deadlines/:id
// ---------------------------------------------------------------------------
deadlinesRouter.patch('/:id', async (req: Request, res: Response) => {
  const firmId  = req.context!.firmId;
  const actorId = req.context!.userId;
  try {
    const deadline = await updateDeadline(req.db, String(req.params.id), firmId, actorId, req.body);
    res.json(deadline);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    if (err.statusCode === 404) return res.status(404).json({ message: err.message });
    throw err;
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/deadlines/:id  (admin + senior only)
// ---------------------------------------------------------------------------
deadlinesRouter.delete('/:id', async (req: Request, res: Response) => {
  const role = req.context?.role;
  if (role !== 'admin' && role !== 'senior') {
    return res.status(403).json({ message: 'Forbidden: admin or senior role required' });
  }
  try {
    await deleteDeadline(req.db, String(req.params.id));
    res.status(204).send();
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ message: err.message });
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /api/deadlines/:id/acknowledge
// ---------------------------------------------------------------------------
deadlinesRouter.post('/:id/acknowledge', async (req: Request, res: Response) => {
  const firmId  = req.context!.firmId;
  const actorId = req.context!.userId;
  try {
    const deadline = await acknowledgeDeadline(req.db, String(req.params.id), firmId, actorId);
    res.json(deadline);
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ message: err.message });
    throw err;
  }
});

// ---------------------------------------------------------------------------
// GET /api/deadlines/ical?token=<firmIcalToken>
// Public — no JWT required; the token IS the auth.
// Mounted on the PUBLIC router in routes/index.js (outside protectedRouter).
// ---------------------------------------------------------------------------
export async function icalFeedHandler(req: Request, res: Response) {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(401).json({ message: 'Token required' });

  const firm = await getFirmByIcalToken(token);
  if (!firm) return res.status(404).json({ message: 'Invalid token' });

  try {
    const icsContent = await withFirmContext(firm.id, (tx) =>
      generateIcalFeed(tx, firm.id),
    );
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="immigration-deadlines.ics"');
    res.send(icsContent);
  } catch (err: any) {
    throw err;
  }
}
