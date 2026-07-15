import { Router, Request, Response } from 'express';
import {
  generateUploadUrl,
  finalizeUpload,
  getDownloadUrl,
  listApplicantDocuments,
  deleteDocument,
} from './documents.service';

export const documentsRouter = Router();

function serviceError(res: Response, err: unknown) {
  const e = err as any;
  const status = typeof e.statusCode === 'number' ? e.statusCode : 500;
  if (e.name === 'ZodError') {
    return res.status(400).json({ message: 'Validation error', errors: e.errors });
  }
  return res.status(status).json({ message: e.message ?? 'Internal error' });
}

// ---------------------------------------------------------------------------
// POST /api/documents/upload-url
// Body: { applicantId, documentType, fileName, mimeType, sizeBytes }
// Returns: { uploadUrl, documentId, s3Key, contentType }
// ---------------------------------------------------------------------------
documentsRouter.post('/upload-url', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    // uploaded_by FKs to `users` (firm staff). Applicant ids live in a separate table,
    // so only record an uploader when the caller is a firm staff member.
    const FIRM_STAFF_ROLES = ['admin', 'senior', 'junior'];
    const uploadedBy = FIRM_STAFF_ROLES.includes(req.context!.role)
      ? (req.context!.userId ?? null)
      : null;
    const result = await generateUploadUrl(req.db, firmId, uploadedBy, req.body);
    res.status(201).json(result);
  } catch (err) {
    serviceError(res, err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/applicant/:applicantId
// Returns all documents for an applicant (RLS scoped to current firm).
// ---------------------------------------------------------------------------
documentsRouter.get('/applicant/:applicantId', async (req: Request, res: Response) => {
  try {
    const rows = await listApplicantDocuments(req.db, String(req.params.applicantId));
    res.json(rows);
  } catch (err) {
    serviceError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/documents/:id/finalize
// Called after the S3 PUT succeeds.  Verifies existence + computes SHA-256.
// Returns 200 with updated doc OR 202 { status: 'hashing_queued' } for large files.
// ---------------------------------------------------------------------------
documentsRouter.post('/:id/finalize', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const result = await finalizeUpload(req.db, String(req.params.id), firmId);
    const httpStatus = 'status' in result && result.status === 'hashing_queued' ? 202 : 200;
    res.status(httpStatus).json(result);
  } catch (err) {
    serviceError(res, err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/:id/download-url
// Returns a short-TTL presigned GET URL.
// ---------------------------------------------------------------------------
documentsRouter.get('/:id/download-url', async (req: Request, res: Response) => {
  try {
    const url = await getDownloadUrl(req.db, String(req.params.id));
    res.json({ url });
  } catch (err) {
    serviceError(res, err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/documents/:id
// Removes the row from Postgres.  S3 object is NOT deleted (Prompt 12+).
// ---------------------------------------------------------------------------
documentsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteDocument(req.db, String(req.params.id));
    res.status(204).end();
  } catch (err) {
    serviceError(res, err);
  }
});
