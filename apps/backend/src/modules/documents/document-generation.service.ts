import Anthropic from '@anthropic-ai/sdk';
import { eq, and, desc } from 'drizzle-orm';
import type { Response } from 'express';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db, withFirmContext } from '../../db/postgres';
import { applicants } from '../../db/schema/applicants';
import { firms } from '../../db/schema/firms';
import { generatedDocuments } from '../../db/schema/generated_documents';
import { aiJobs } from '../../db/schema/ai_jobs';
import { s3 } from '../documents/documents.service';
import { buildGenerationPrompt, GENERATION_SYSTEM_PROMPT, type DocType } from './generation-prompts';
import { renderToPDF } from './pdf-renderer';

const BUCKET = () => process.env.AWS_S3_BUCKET_NAME ?? '';
const DOWNLOAD_TTL = 15 * 60; // 15 minutes
const GENERATION_MODEL = 'claude-sonnet-4-6';
const DAILY_LIMIT = Number(process.env.APPLICANT_GEN_DAILY_LIMIT ?? '10');

// ─── Rate limiting ────────────────────────────────────────────────────────────

async function checkDailyLimit(applicantId: string): Promise<void> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({ id: generatedDocuments.id })
    .from(generatedDocuments)
    .where(eq(generatedDocuments.applicant_id, applicantId));

  // Filter in JS since we don't have date comparison set up with drizzle here
  const todayCount = rows.filter((r) => {
    // generatedDocuments rows don't carry created_at here without selecting it — re-fetch
    return true;
  }).length;

  // Simple approach: count all docs created today by fetching created_at
  const allRows = await db
    .select({ created_at: generatedDocuments.created_at })
    .from(generatedDocuments)
    .where(eq(generatedDocuments.applicant_id, applicantId));

  const todayGenCount = allRows.filter((r) => r.created_at && r.created_at >= since).length;

  if (todayGenCount >= DAILY_LIMIT) {
    throw Object.assign(
      new Error(`Daily generation limit of ${DAILY_LIMIT} reached. Try again tomorrow.`),
      { statusCode: 429 },
    );
  }
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generateDocument(
  applicantId: string,
  firmId: string,
  type: DocType,
  res: Response,
): Promise<void> {
  // 1. Load applicant
  const [applicant] = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, applicantId), eq(applicants.firm_id, firmId)))
    .limit(1);

  if (!applicant) {
    throw Object.assign(new Error('Applicant not found'), { statusCode: 404 });
  }

  // 2. Load firm
  const [firm] = await db.select().from(firms).where(eq(firms.id, firmId)).limit(1);
  if (!firm) throw Object.assign(new Error('Firm not found'), { statusCode: 404 });

  // 3. Rate limit
  await checkDailyLimit(applicantId);

  // 4. Next version number
  const [lastDoc] = await db
    .select({ version: generatedDocuments.version })
    .from(generatedDocuments)
    .where(and(eq(generatedDocuments.applicant_id, applicantId), eq(generatedDocuments.doc_type, type)))
    .orderBy(desc(generatedDocuments.version))
    .limit(1);
  const nextVersion = (lastDoc?.version ?? 0) + 1;

  // 5. Stream AI content
  const prompt = buildGenerationPrompt(type, applicant, firm);

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Cache-Control', 'no-cache');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let generatedText = '';
  let promptTokens = 0;
  let completionTokens = 0;

  const stream = client.messages.stream({
    model: GENERATION_MODEL,
    max_tokens: 1500,
    system: GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      generatedText += event.delta.text;
      res.write(JSON.stringify({ type: 'text', delta: event.delta.text }) + '\n');
    }
  }

  const finalMsg = await stream.finalMessage();
  promptTokens = finalMsg.usage.input_tokens;
  completionTokens = finalMsg.usage.output_tokens;

  // 6. Render to PDF
  const pdfBuffer = await renderToPDF(generatedText, type, applicant, firm);

  // 7. Upload to S3
  const s3Key = `firms/${firmId}/applicants/${applicantId}/generated/${type}_v${nextVersion}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    }),
  );

  // 8. Persist record + log cost
  const costCents = Math.round(
    (promptTokens * 0.003 + completionTokens * 0.015) * 100,
  );

  const [saved] = await withFirmContext(firmId, (tx) =>
    tx
      .insert(generatedDocuments)
      .values({
        firm_id: firmId,
        applicant_id: applicantId,
        doc_type: type,
        version: nextVersion,
        s3_key: s3Key,
        file_size_bytes: pdfBuffer.length,
        ai_model: GENERATION_MODEL,
        cost_cents: costCents,
      })
      .returning(),
  );

  // Log to ai_jobs for cost tracking
  try {
    await withFirmContext(firmId, (tx) =>
      tx.insert(aiJobs).values({
        firm_id: firmId,
        job_type: 'chat', // closest existing type for generation
        related_entity_type: 'applicant',
        related_entity_id: applicantId,
        model: GENERATION_MODEL,
        provider: 'anthropic',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_cents: costCents.toString(),
        latency_ms: 0,
        status: 'success',
        input_summary: { doc_type: type, version: nextVersion },
        output: { docId: saved.id },
      }),
    );
  } catch (logErr: unknown) {
    console.error('[doc-gen] Cost log failed (non-fatal):', (logErr as Error).message);
  }

  // 9. Emit ready event
  try {
    const { emitToUser } = await import('../../socket/index.js');
    emitToUser(firmId, applicantId, 'document:generated', {
      docId: saved.id,
      docType: type,
      version: nextVersion,
      downloadReady: true,
    });
  } catch {
    // socket offline — skip
  }

  res.write(JSON.stringify({ type: 'done', docId: saved.id, version: nextVersion }) + '\n');
  res.end();
}

// ─── List generated documents ─────────────────────────────────────────────────

export async function listGeneratedDocuments(
  applicantId: string,
  firmId: string,
): Promise<Array<{ id: string; doc_type: string; version: number; created_at: Date; downloadUrl?: string }>> {
  const rows = await db
    .select()
    .from(generatedDocuments)
    .where(
      and(
        eq(generatedDocuments.applicant_id, applicantId),
        eq(generatedDocuments.firm_id, firmId),
      ),
    )
    .orderBy(desc(generatedDocuments.created_at));

  return rows.map((r) => ({
    id: r.id,
    doc_type: r.doc_type,
    version: r.version,
    created_at: r.created_at,
    ai_model: r.ai_model,
    file_size_bytes: r.file_size_bytes,
  }));
}

// ─── Get presigned download URL ────────────────────────────────────────────────

export async function getGeneratedDocumentUrl(
  docId: string,
  applicantId: string,
  firmId: string,
): Promise<string> {
  const [doc] = await db
    .select()
    .from(generatedDocuments)
    .where(
      and(
        eq(generatedDocuments.id, docId),
        eq(generatedDocuments.applicant_id, applicantId),
        eq(generatedDocuments.firm_id, firmId),
      ),
    )
    .limit(1);

  if (!doc) throw Object.assign(new Error('Generated document not found'), { statusCode: 404 });

  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: doc.s3_key,
    ResponseContentDisposition: `inline; filename="${doc.doc_type}_v${doc.version}.pdf"`,
    ResponseContentType: 'application/pdf',
  });

  return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_TTL });
}
