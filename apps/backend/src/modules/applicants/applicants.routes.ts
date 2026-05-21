/**
 * Postgres-backed student CRUD routes.
 *
 * Mounting strategy in routes/index.js:
 *   protectedRouter.use('/students', pgStudentsRouter);   // 1st — handles these 5 paths
 *   protectedRouter.use('/students', legacyStudentRouter); // 2nd — fallback for
 *     document management, task management, S3 uploads, and GET /:aiKey
 *
 * Route conflicts handled explicitly:
 *   GET  /:id  — if the param is a UUID, queries Postgres; otherwise calls next()
 *               so the legacy router's GET /:aiKey can handle it.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
  listApplicants,
  getApplicantById,
  createApplicant,
  updateApplicant,
  deleteApplicant,
} from './applicants.service';

export const applicantsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/students
// ---------------------------------------------------------------------------
applicantsRouter.get('/', async (req: Request, res: Response) => {
  const rows = await listApplicants(req.db, {
    status: req.query.status as string | undefined,
    stage: req.query.stage as string | undefined,
    search: req.query.search as string | undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
  });
  res.json(rows);
});

// ---------------------------------------------------------------------------
// GET /api/students/:id  (UUID only — falls through to legacy for aiKey)
// ---------------------------------------------------------------------------
applicantsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  if (!UUID_RE.test(req.params.id)) {
    return next(); // Let legacy router handle /:aiKey and /registered etc.
  }
  const student = await getApplicantById(req.db, req.params.id);
  if (!student) return res.status(404).json({ message: 'Applicant not found' });
  res.json(student);
});

// ---------------------------------------------------------------------------
// POST /api/students
// ---------------------------------------------------------------------------
applicantsRouter.post('/', async (req: Request, res: Response) => {
  const firmId = req.context!.firmId;
  try {
    const student = await createApplicant(req.db, firmId, req.body);
    res.status(201).json(student);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A student with that email already exists in this firm' });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/students/:id
// ---------------------------------------------------------------------------
applicantsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  if (!UUID_RE.test(req.params.id)) return next();
  try {
    const student = await updateApplicant(req.db, req.params.id, req.body);
    res.json(student);
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
// DELETE /api/students/:id  (soft — sets status = 'closed')
// ---------------------------------------------------------------------------
applicantsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  if (!UUID_RE.test(req.params.id)) return next();
  try {
    const student = await deleteApplicant(req.db, req.params.id);
    res.json({ message: 'Applicant closed', student });
  } catch (err: any) {
    if (err.statusCode === 404) {
      return res.status(404).json({ message: err.message });
    }
    throw err;
  }
});
