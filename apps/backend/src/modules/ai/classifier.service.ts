import { runAIJob, type OAIMessage, type AIJobContext } from './ai-orchestrator.service';

// ─── Prompt (verbatim from AI/ai-file-extract/document-classifier.js) ─────────
export const CLASSIFY_SYSTEM_PROMPT = `You are an expert document classifier for an immigration CRM.
Classify the provided document into one of the following categories:
- Passport
- Visa
- Resume / CV
- Cover Letter
- Educational Transcript
- Language Test Result (IELTS/CELPIP)
- Bank Statement
- Police Certificate
- Medical Exam
- Application Form
- Other / Unknown

Return ONLY the category name.`;

export async function classifyDocument(
  { text, images = [] }: { text: string; images?: string[] },
  context: AIJobContext,
): Promise<string> {
  const content: OAIMessage['content'] = [];

  if (text && text.trim().length) {
    content.push({ type: 'text', text: text.substring(0, 2000) });
  }
  if (images.length > 0) {
    content.push({ type: 'image_url', image_url: { url: images[0] } });
  }

  const messages: OAIMessage[] = [
    { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
    { role: 'user', content: content as OAIMessage['content'] },
  ];

  try {
    const result = await runAIJob('field_extract', messages, context);
    return result.trim();
  } catch {
    return 'Unknown';
  }
}
