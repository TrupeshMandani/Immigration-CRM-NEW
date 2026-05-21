import { readFileSync } from 'fs';
import { runAIJob, type OAIMessage, type AIJobContext } from './ai-orchestrator.service';
import { extractTextFromFile } from './extract.service';

// Lazy-loaded — only needed for PDF/image paths
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pdfToImages } = require('./utils/pdf-to-images');

// ─── Prompts (verbatim from AI/ai-document-verify/verification.service.js) ────
export const VERIFY_SYSTEM_PROMPT =
  'You are an immigration compliance assistant who labels documents with high precision.';

export function buildVerifyUserPrompt(expectedType: string): string {
  return `You must determine if the provided document is a "${expectedType}".
Respond with JSON: {"status":"verified|failed|pending","detectedType":"string","confidence":0-1,"reason":"string"}.
Mark as:
- "verified" only if you are sure it matches the expected type.
- "failed" if it clearly is a different document.
- "pending" if the content is unreadable, incomplete, or uncertain.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(['pending', 'verified', 'failed']);

function normalizeStatus(status: unknown): 'pending' | 'verified' | 'failed' {
  if (!status) return 'pending';
  const lower = String(status).toLowerCase();
  if (VALID_STATUSES.has(lower)) return lower as 'pending' | 'verified' | 'failed';
  if (lower === 'pass') return 'verified';
  if (lower === 'fail') return 'failed';
  return 'pending';
}

function safeJsonParse(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end >= start) {
      try { return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>; } catch { return {}; }
    }
    return {};
  }
}

async function buildImagePayload(filePath: string, mimeType: string): Promise<string[]> {
  if (!mimeType) return [];
  if (mimeType === 'application/pdf') return pdfToImages(filePath) as Promise<string[]>;
  if (mimeType.startsWith('image/')) {
    const base64 = readFileSync(filePath).toString('base64');
    return [`data:${mimeType};base64,${base64}`];
  }
  return [];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface VerificationResult {
  status: 'pending' | 'verified' | 'failed';
  confidence: number;
  detectedType: string;
  reason: string;
  expectedType: string;
  model: string;
  checkedAt: Date;
}

export async function verifyDocumentType(
  { expectedType, filePath, mimeType }: { expectedType: string; filePath: string; mimeType: string },
  context: AIJobContext,
): Promise<VerificationResult> {
  const base: VerificationResult = {
    status: 'pending',
    confidence: 0,
    detectedType: '',
    reason: 'Waiting for AI verification',
    expectedType: expectedType || 'Document',
    model: 'claude-haiku-4-5-20251001',
    checkedAt: new Date(),
  };

  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    base.reason = 'AI credentials missing; manual verification required.';
    return base;
  }

  try {
    const extractedText = await extractTextFromFile(filePath, mimeType);
    const trimmedText = (extractedText || '').trim().slice(0, 6000);
    const includeImages = !trimmedText || trimmedText.length < 200;
    const images = includeImages ? await buildImagePayload(filePath, mimeType) : [];

    // User content: text instruction + extracted text + images
    const userBlocks: OAIMessage['content'] = [
      { type: 'text', text: buildVerifyUserPrompt(expectedType) },
    ];
    if (trimmedText) {
      userBlocks.push({ type: 'text', text: `Extracted text:\n${trimmedText}` } as { type: 'text'; text: string });
    }
    for (const img of images) {
      userBlocks.push({ type: 'image_url', image_url: { url: img } });
    }

    const messages: OAIMessage[] = [
      { role: 'system', content: VERIFY_SYSTEM_PROMPT },
      { role: 'user', content: userBlocks as OAIMessage['content'] },
    ];

    const raw = await runAIJob('doc_verify', messages, context);
    const payload = safeJsonParse(raw);

    base.status = normalizeStatus(payload.status);
    base.confidence = Number(payload.confidence) || 0;
    base.detectedType = (payload.detectedType as string) || '';
    base.reason =
      (payload.reason as string) ||
      (base.status === 'verified' ? 'AI verified document type.' : 'AI could not confirm the document.');
    base.checkedAt = new Date();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('AI verification failed:', msg);
    base.reason = 'AI verification unavailable. Manual review required.';
  }

  return base;
}
