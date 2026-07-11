/**
 * Postgres-backed applicant CRUD routes.
 *
 * Mounting strategy in routes/index.js:
 *   protectedRouter.use('/applicants', applicantsRouter);   // 1st — handles list/read/update/delete
 *   protectedRouter.use('/applicants', legacyApplicantRouter); // 2nd — handles POST /,
 *     document management, task management, S3 uploads, and GET /:aiKey
 *
 * Route conflicts handled explicitly:
 *   GET  /:id  — if the param is a UUID, queries Postgres; otherwise calls next()
 *               so the legacy router's GET /:aiKey can handle it.
 *   POST /    — INTENTIONALLY not handled here. The admin "Create Applicant" UI
 *               sends a {name, email, phone, message} payload and relies on the
 *               legacy controller's full onboarding flow (duplicate-email check
 *               across applicants + users, invite email, admin notification, and
 *               a `{ applicant: { id, email, status } }` response shape). Express
 *               falls through to legacyApplicantRouter.post('/') when this router
 *               declares no handler for the verb.
 */
import { Router, Request, Response, NextFunction } from 'express';
import {
  listApplicants,
  getApplicantById,
  updateApplicant,
  deleteApplicant,
} from './applicants.service';

export const applicantsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Zod 4 exposes parsing failures as `.issues`; Zod 3 used `.errors`. Read both
// so the route stays correct under either runtime.
const zodIssues = (err: any) =>
  Array.isArray(err?.issues) ? err.issues : Array.isArray(err?.errors) ? err.errors : [];

// ---------------------------------------------------------------------------
// GET /api/applicants
// ---------------------------------------------------------------------------
applicantsRouter.get('/', async (req: Request, res: Response) => {
  // Pass req.query directly; ApplicantFiltersSchema.parse() coerces + validates inside listApplicants.
  const rows = await listApplicants(req.db, req.query as any);
  res.json(rows);
});

// ---------------------------------------------------------------------------
// GET /api/applicants/:id  (UUID only — falls through to legacy for aiKey)
// ---------------------------------------------------------------------------
applicantsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) {
    return next(); // Let legacy router handle /:aiKey and /registered etc.
  }
  const applicant = await getApplicantById(req.db, id);
  if (!applicant) return res.status(404).json({ message: 'Applicant not found' });
  res.json(applicant);
});

// ---------------------------------------------------------------------------
// PATCH /api/applicants/:id
// ---------------------------------------------------------------------------
applicantsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) return next();
  try {
    const applicant = await updateApplicant(req.db, id, req.body);
    res.json(applicant);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation error', errors: zodIssues(err) });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ message: err.message });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/applicants/:id  (soft — sets status = 'closed')
// ---------------------------------------------------------------------------
applicantsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) return next();
  try {
    const applicant = await deleteApplicant(req.db, id);
    res.json({ message: 'Applicant closed', applicant });
  } catch (err: any) {
    if (err.statusCode === 404) {
      return res.status(404).json({ message: err.message });
    }
    throw err;
  }
});
