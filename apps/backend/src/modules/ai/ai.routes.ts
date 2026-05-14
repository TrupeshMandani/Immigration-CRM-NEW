import { Router, Request, Response } from 'express';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { documents } from '../../db/schema/documents';
import { students } from '../../db/schema/students';
import { verifyQueue } from './verify.queue';
import { generateUniversityListFromProfile } from './recommendation.service';

export const aiRouter = Router();

function svcError(res: Response, err: unknown) {
  const e = err as { statusCode?: number; message?: string };
  return res.status(e.statusCode ?? 500).json({ message: e.message ?? 'Internal error' });
}

// ---------------------------------------------------------------------------
// POST /api/ai/verify-document/:documentId
// Runs AI verification immediately (not via queue). Returns verdict.
// ---------------------------------------------------------------------------
aiRouter.post('/verify-document/:documentId', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const documentId = req.params.documentId as string;

    const [doc] = await req.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!doc.s3_key || !doc.s3_bucket) {
      return res.status(400).json({ message: 'Document has no S3 location' });
    }

    await verifyQueue.add('verify', {
      documentId: doc.id,
      firmId,
      studentId: doc.student_id,
      s3Key: doc.s3_key,
      s3Bucket: doc.s3_bucket,
      documentType: doc.document_type ?? 'Document',
      mimeType: doc.mime_type ?? 'application/octet-stream',
    });

    res.status(202).json({ status: 'queued', documentId });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/extract-fields/:documentId
// Runs field extraction on an already-uploaded document.
// (Synchronous — caller waits for result.)
// ---------------------------------------------------------------------------
aiRouter.post('/extract-fields/:documentId', async (req: Request, res: Response) => {
  try {
    const documentId = req.params.documentId as string;

    const [doc] = await req.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Field extraction requires the file to be local; for now we return the
    // existing ai_verification fields so callers can inspect what was captured.
    const current = (doc.ai_verification ?? {}) as Record<string, unknown>;
    res.json({ documentId, fields: current });
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/recommendations/:studentId
// Generates university recommendations for a student.
// ---------------------------------------------------------------------------
aiRouter.post('/recommendations/:studentId', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const studentId = req.params.studentId as string;

    const [student] = await req.db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student) return res.status(404).json({ message: 'Student not found' });

    const profile = (student.profile_data ?? {}) as Record<string, unknown>;
    const result = await generateUniversityListFromProfile(profile, {
      firmId,
      relatedEntityType: 'student',
      relatedEntityId: studentId,
    });

    res.json(result);
  } catch (err) {
    svcError(res, err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// Delegates to MCP server (unchanged behavior). Ensures firm_id propagates.
// ---------------------------------------------------------------------------
aiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, studentId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const firmId = req.context!.firmId;
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : (req.headers.authorization ?? '');

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const mcpUrl = process.env.MCP_SERVER_URL ?? 'http://localhost:3002/api/chat';
    const response = await axios.post(
      mcpUrl,
      { message, studentId, firmId },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'X-Firm-Id': firmId,
        },
        responseType: 'stream',
      },
    );

    (response.data as NodeJS.ReadableStream).pipe(res);
    await new Promise<void>((resolve, reject) => {
      (response.data as NodeJS.ReadableStream).on('end', resolve);
      (response.data as NodeJS.ReadableStream).on('error', reject);
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'MCP communication error';
    console.error('[ai-chat] error:', msg);
    if (!res.headersSent) {
      res.write(JSON.stringify({ error: "I'm sorry, I encountered an error while communicating with the AI agent." }));
      res.end();
    }
  }
});
