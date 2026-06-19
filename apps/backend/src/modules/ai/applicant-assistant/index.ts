import OpenAI from 'openai';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Response } from 'express';
import { db } from '../../../db/postgres';
import { applicants } from '../../../db/schema/applicants';
import { applicantChatMessages, type ApplicantChatMessage } from '../../../db/schema/applicant_chat_messages';
import { aiJobs } from '../../../db/schema/ai_jobs';
import { buildSystemPrompt } from './context-builder';
import { APPLICANT_TOOLS, executeTool } from './tools';

const MODEL = 'gpt-4o-mini';
const DAILY_LIMIT = 50;
const MAX_TOOL_ITERATIONS = 5;
// gpt-4o-mini pricing: $0.15 / MTok input, $0.60 / MTok output → in cents per token:
const PRICE_INPUT  = 0.000015;
const PRICE_OUTPUT = 0.00006;

// ─── Cost helper ──────────────────────────────────────────────────────────────

function calcCostCents(inputTokens: number, outputTokens: number): number {
  return Math.round((PRICE_INPUT * inputTokens + PRICE_OUTPUT * outputTokens) * 10000) / 10000;
}

// ─── NDJSON write helper ──────────────────────────────────────────────────────

function writeChunk(res: Response, payload: Record<string, unknown>): void {
  res.write(JSON.stringify(payload) + '\n');
}

// ─── Chat history endpoint helper (exported for GET route) ───────────────────

export async function getChatHistory(applicantId: string): Promise<ApplicantChatMessage[]> {
  return db
    .select()
    .from(applicantChatMessages)
    .where(eq(applicantChatMessages.applicant_id, applicantId))
    .orderBy(desc(applicantChatMessages.created_at))
    .limit(20);
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function handleApplicantChat(
  aiKey: string,
  firmId: string,
  userMessage: string,
  chatFile: Express.Multer.File | null,
  res: Response,
): Promise<void> {
  // 1. Resolve applicant
  const [applicant] = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.ai_key, aiKey), eq(applicants.firm_id, firmId)))
    .limit(1);

  if (!applicant) {
    res.status(404).json({ error: 'Applicant not found' });
    return;
  }

  // 2. Rate limit (50 user messages / day)
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(applicantChatMessages)
    .where(and(
      eq(applicantChatMessages.applicant_id, applicant.id),
      eq(applicantChatMessages.role, 'user'),
      sql`created_at > now() - interval '1 day'`,
    ));

  if (Number(countRow?.count ?? 0) >= DAILY_LIMIT) {
    res.status(429).json({ error: 'Daily message limit reached. Try again tomorrow.' });
    return;
  }

  // 3. Load last 20 messages for conversation history
  const history = await db
    .select()
    .from(applicantChatMessages)
    .where(eq(applicantChatMessages.applicant_id, applicant.id))
    .orderBy(desc(applicantChatMessages.created_at))
    .limit(20);

  // OpenAI message format
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = history.reverse().map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content ?? '',
  }));
  messages.push({ role: 'user', content: userMessage });

  // 4. Persist user message
  await db.insert(applicantChatMessages).values({
    firm_id: firmId,
    applicant_id: applicant.id,
    role: 'user',
    content: userMessage,
  });

  // 5. Build system prompt (includes profile, docs, tasks)
  let systemPrompt: string;
  try {
    systemPrompt = await buildSystemPrompt({ applicantId: applicant.id, firmId });
  } catch {
    res.status(500).json({ error: 'Failed to build assistant context.' });
    return;
  }

  if (chatFile) {
    systemPrompt +=
      `\n\nATTACHED FILE: The applicant has attached a file named "${chatFile.originalname}" ` +
      `(${chatFile.mimetype}, ${(chatFile.size / 1024).toFixed(0)} KB). ` +
      `If the applicant has stated or confirmed what type of document this is, call the upload_document tool immediately. ` +
      `If the document type is ambiguous, ask ONE clarifying question before uploading.`;
  }

  // 6. Set streaming headers
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let totalInputTokens  = 0;
  let totalOutputTokens = 0;
  let lastAssistantText = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastUploadResult: any = null;

  try {
    // 7. Agentic loop — max MAX_TOOL_ITERATIONS to prevent runaway
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      let assistantText = '';
      // Accumulate tool call fragments by index (OpenAI streams tool calls in deltas)
      const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
      let finishReason: string | null = null;

      const stream = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        tools: APPLICANT_TOOLS as unknown as OpenAI.Chat.ChatCompletionTool[],
        stream: true,
        stream_options: { include_usage: true },
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];

        // Accumulate usage (sent in the last chunk when stream_options.include_usage is true)
        if (chunk.usage) {
          totalInputTokens  += chunk.usage.prompt_tokens;
          totalOutputTokens += chunk.usage.completion_tokens;
        }

        if (!choice) continue;

        if (choice.finish_reason) finishReason = choice.finish_reason;

        const delta = choice.delta;

        // Stream text deltas to the client
        if (delta.content) {
          assistantText += delta.content;
          writeChunk(res, { type: 'text', delta: delta.content });
        }

        // Accumulate tool call fragments
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallsMap.has(tc.index)) {
              toolCallsMap.set(tc.index, { id: '', name: '', arguments: '' });
            }
            const block = toolCallsMap.get(tc.index)!;
            if (tc.id)                block.id        = tc.id;
            if (tc.function?.name)    block.name      = tc.function.name;
            if (tc.function?.arguments) block.arguments += tc.function.arguments;
          }
        }
      }

      lastAssistantText = assistantText;

      // No tool calls → done
      if (finishReason !== 'tool_calls' || toolCallsMap.size === 0) {
        await db.insert(applicantChatMessages).values({
          firm_id:      firmId,
          applicant_id: applicant.id,
          role:         'assistant',
          content:      assistantText,
          model:        MODEL,
          cost_cents:   Math.round(calcCostCents(totalInputTokens, totalOutputTokens)),
        });
        break;
      }

      // Parse completed tool calls
      const toolCalls = Array.from(toolCallsMap.values()).map((block) => {
        let input: Record<string, any> = {};
        try { input = JSON.parse(block.arguments || '{}'); } catch { /* malformed JSON */ }
        return { id: block.id, name: block.name, input };
      });

      // Add assistant message (with tool_calls) to history
      messages.push({
        role: 'assistant',
        content: assistantText || null,
        tool_calls: toolCalls.map((tc) => ({
          id:       tc.id,
          type:     'function' as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.input) },
        })),
      });

      // Execute tools and collect results
      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const result = await executeTool(tc.name, tc.input, applicant.id, firmId, chatFile);
          if (tc.name === 'upload_document') {
            try {
              const parsed = JSON.parse(result);
              if (parsed.success) lastUploadResult = parsed;
            } catch { /* ignore */ }
          }
          return { tool_call_id: tc.id, content: result };
        }),
      );

      // Add tool results to history (OpenAI uses role: 'tool')
      for (const r of toolResults) {
        messages.push({ role: 'tool', tool_call_id: r.tool_call_id, content: r.content });
      }
    }

    // 8. Emit optional document_uploaded event
    if (lastUploadResult) {
      writeChunk(res, {
        type:         'document_uploaded',
        documentName: lastUploadResult.documentName,
        renamedTo:    lastUploadResult.renamedTo,
        documentId:   lastUploadResult.documentId,
      });
    }

    // 9. Log to ai_jobs
    const costCents = calcCostCents(totalInputTokens, totalOutputTokens);
    await db.insert(aiJobs).values({
      firm_id:             firmId,
      job_type:            'chat',
      related_entity_type: 'applicant',
      related_entity_id:   applicant.id,
      model:               MODEL,
      provider:            'openai',
      prompt_tokens:       totalInputTokens,
      completion_tokens:   totalOutputTokens,
      cost_cents:          costCents.toFixed(4),
      latency_ms:          0,
      status:              'success',
      input_summary: {
        job_type:           'applicant_chat',
        user_message_chars: userMessage.length,
        has_attachment:     chatFile != null,
      },
      output: { assistant_text_chars: lastAssistantText.length },
    });

    writeChunk(res, { type: 'done' });
    res.end();

  } catch (err: any) {
    console.error('[applicant-assistant] error:', err?.message ?? err);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Assistant is temporarily unavailable. Please try again shortly.' });
    } else {
      writeChunk(res, { type: 'error', message: 'Assistant is temporarily unavailable.' });
      res.end();
    }
  } finally {
    if (chatFile?.path) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { deleteLocalFile } = require('../../s3/s3.service');
        deleteLocalFile(chatFile.path);
      } catch { /* ignore cleanup error */ }
    }
  }
}
