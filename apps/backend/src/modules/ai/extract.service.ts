import { createReadStream, readFileSync } from 'fs';
// pdf-parse v2 exposes a class-based API (the old callable default export is gone).
// Keep require to avoid ESM/TS interop friction; instantiate PDFParse per document.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (opts: { data: Buffer }) => {
    getText(): Promise<{ text: string }>;
    destroy(): Promise<void>;
  };
};
import mammoth from 'mammoth';
import { runAIJob, type OAIMessage, type AIJobContext } from './ai-orchestrator.service';
import { classifyDocument } from './classifier.service';

// Lazy-loaded to avoid startup cost; pdfToImages is heavy.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pdfToImages } = require('./utils/pdf-to-images');

// ─── Prompt (verbatim from AI/ai.service.js) ──────────────────────────────────
export const EXTRACT_SYSTEM_PROMPT_BASE = `You are an expert immigration document analyst.
Your task is to extract key information from the provided document text and/or images.
Return a valid JSON object.
`;
// schemaDescription is interpolated at call time — the full system prompt becomes:
// EXTRACT_SYSTEM_PROMPT_BASE + `Follow this structure: ${schemaDescription}` + rest
// OR EXTRACT_SYSTEM_PROMPT_BASE + "Extract important fields..." + rest
// This matches the original template literal verbatim.
const EXTRACT_PROMPT_SUFFIX = `- Do NOT include explanations.
- Use ISO dates (YYYY-MM-DD) where possible.
- If a field is missing or unclear, omit it or use null.`;

export function buildExtractSystemPrompt(schemaDescription = ''): string {
  return `You are an expert immigration document analyst.
Your task is to extract key information from the provided document text and/or images.
Return a valid JSON object.
${schemaDescription ? `Follow this structure: ${schemaDescription}` : 'Extract important fields like Name, DateOfBirth, PassportNumber, ExpiryDate, etc.'}
- Do NOT include explanations.
- Use ISO dates (YYYY-MM-DD) where possible.
- If a field is missing or unclear, omit it or use null.`;
}

export async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: readFileSync(filePath) });
    try {
      const { text } = await parser.getText();
      return text || '';
    } finally {
      await parser.destroy();
    }
  }
  if (mimeType.includes('word') || filePath.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value || '';
  }
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

export async function extractImportantFields(
  { text, images = [], schemaDescription = '' }: { text: string; images?: string[]; schemaDescription?: string },
  context: AIJobContext,
): Promise<Record<string, unknown>> {
  const system = buildExtractSystemPrompt(schemaDescription);

  const userContent: OAIMessage['content'] = [];
  if (text && text.trim().length) {
    userContent.push({ type: 'text', text });
  }
  for (const img of images) {
    userContent.push({ type: 'image_url', image_url: { url: img } });
  }

  const messages: OAIMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: userContent as OAIMessage['content'] },
  ];

  try {
    const raw = await runAIJob('field_extract', messages, context);
    if (!raw) throw new Error('No content returned');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

interface FileInput {
  path: string;
  mimetype: string;
  originalname?: string;
}

export async function extractProfileWithAI(
  files: FileInput[],
  context: AIJobContext,
): Promise<Record<string, unknown>> {
  const results: Array<{ fileName: string; docType: string; data: Record<string, unknown> }> = [];

  for (const f of files) {
    let text = await extractTextFromFile(f.path, f.mimetype);
    let images: string[] = [];

    if (!text || text.trim().length < 50 || f.mimetype.startsWith('image/')) {
      if (f.mimetype === 'application/pdf') {
        images = await pdfToImages(f.path);
      } else if (f.mimetype.startsWith('image/')) {
        const base64 = readFileSync(f.path).toString('base64');
        images.push(`data:${f.mimetype};base64,${base64}`);
      }
    }

    const docType = await classifyDocument({ text, images }, context);

    let schemaDescription = '';
    if (docType === 'Passport') {
      schemaDescription = '{ Name, DateOfBirth, PassportNumber, ExpiryDate, Nationality, IssuingCountry }';
    } else if (docType === 'Resume / CV') {
      schemaDescription = '{ FullName, Email, Phone, Skills: [], Experience: [{ Title, Company, StartDate, EndDate }], Education: [{ Degree, Institution, Year }] }';
    }

    const data = await extractImportantFields({ text, images, schemaDescription }, context);

    results.push({ fileName: f.originalname ?? f.path, docType, data });
  }

  // Merge only the extracted field data. We intentionally do NOT attach any
  // metadata (e.g. a documentsFound array) onto the profile — consumers treat
  // every key as an extracted field, so a nested object/array would surface to
  // the applicant as a "[object Object]" field and pollute the stored profile.
  const mergedProfile = results.reduce<Record<string, unknown>>(
    (acc, curr) => ({ ...acc, ...curr.data }),
    {},
  );

  return mergedProfile;
}
