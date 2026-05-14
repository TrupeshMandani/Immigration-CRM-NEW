import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { db, withFirmContext } from '../../db/postgres';
import { aiJobs } from '../../db/schema/ai_jobs';

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobType = 'doc_verify' | 'field_extract' | 'recommendation' | 'chat' | 'fraud_screen';

// OpenAI-compatible message format (what the service files produce)
export interface OAITextBlock { type: 'text'; text: string }
export interface OAIImageBlock { type: 'image_url'; image_url: { url: string } }
export type OAIContentBlock = OAITextBlock | OAIImageBlock;

export interface OAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OAIContentBlock[];
}

export interface AIJobContext {
  firmId: string;
  relatedEntityType: 'document' | 'student' | 'case';
  relatedEntityId: string;
}

// ─── Model routing ─────────────────────────────────────────────────────────────

const ANTHROPIC_MODELS: Record<JobType, string> = {
  doc_verify:     'claude-haiku-4-5-20251001',
  field_extract:  'claude-haiku-4-5-20251001',
  fraud_screen:   'claude-haiku-4-5-20251001',
  recommendation: 'claude-sonnet-4-6',
  chat:           'claude-sonnet-4-6',
};

// OpenAI fallback: cheap models for cheap tasks, mid-tier for the rest
const OPENAI_FALLBACK_MODELS: Record<JobType, string> = {
  doc_verify:     'gpt-4o-mini',
  field_extract:  'gpt-4o-mini',
  fraud_screen:   'gpt-4o-mini',
  recommendation: 'gpt-4o',
  chat:           'gpt-4o',
};

// ─── Cost calculation (cost_cents = fractional cents) ─────────────────────────
// Prices per million tokens, converted to cents-per-token.

const PRICE_PER_TOKEN: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.0008,  output: 0.004  },  // $0.80/$4 per MTok
  'claude-sonnet-4-6':         { input: 0.003,   output: 0.015  },  // $3/$15 per MTok
  'gpt-4o-mini':               { input: 0.00015, output: 0.0006 },  // $0.15/$0.6 per MTok
  'gpt-4o':                    { input: 0.005,   output: 0.015  },  // $5/$15 per MTok
};

function calcCostCents(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICE_PER_TOKEN[model];
  if (!p) return 0;
  return p.input * promptTokens + p.output * completionTokens;
}

// ─── PII redaction helper ─────────────────────────────────────────────────────

function redactedInputSummary(jobType: JobType, messages: OAIMessage[]): Record<string, unknown> {
  const systemMsg = messages.find((m) => m.role === 'system');
  const userMsgs = messages.filter((m) => m.role === 'user');

  let imageCount = 0;
  let textLen = 0;
  for (const m of userMsgs) {
    if (typeof m.content === 'string') {
      textLen += m.content.length;
    } else {
      for (const b of m.content) {
        if (b.type === 'text') textLen += b.text.length;
        if (b.type === 'image_url') imageCount++;
      }
    }
  }

  return {
    job_type: jobType,
    has_system_prompt: Boolean(systemMsg),
    user_message_count: userMsgs.length,
    approx_text_chars: textLen,
    image_count: imageCount,
  };
}

// ─── Anthropic adapter ────────────────────────────────────────────────────────

function toAnthropicMessages(messages: OAIMessage[]): {
  system: string | undefined;
  msgs: Anthropic.Messages.MessageParam[];
} {
  const systemMsgs = messages.filter((m) => m.role === 'system');
  const system = systemMsgs.map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n') || undefined;

  const msgs: Anthropic.Messages.MessageParam[] = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      if (typeof m.content === 'string') {
        return { role: m.role as 'user' | 'assistant', content: m.content };
      }
      const content: Anthropic.Messages.ContentBlockParam[] = m.content.map((b) => {
        if (b.type === 'text') {
          return { type: 'text', text: b.text } as Anthropic.Messages.TextBlockParam;
        }
        // Convert data URI or URL to Anthropic image block
        const url = b.image_url.url;
        const dataMatch = url.match(/^data:([^;]+);base64,(.+)$/);
        if (dataMatch) {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: dataMatch[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: dataMatch[2],
            },
          } as Anthropic.Messages.ImageBlockParam;
        }
        // URL-based image — Anthropic doesn't support remote URLs directly,
        // fall back to a text description so the call still completes.
        return { type: 'text', text: `[Image: ${url}]` } as Anthropic.Messages.TextBlockParam;
      });
      return { role: m.role as 'user' | 'assistant', content };
    });

  return { system, msgs };
}

// ─── Provider calls ───────────────────────────────────────────────────────────

async function callAnthropic(
  model: string,
  messages: OAIMessage[],
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { system, msgs } = toAnthropicMessages(messages);

  const systemBlock: Anthropic.Messages.TextBlockParam[] | undefined = system
    ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
    : undefined;

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    ...(systemBlock ? { system: systemBlock } : {}),
    messages: msgs,
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return {
    text,
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
  };
}

async function callOpenAI(
  model: string,
  messages: OAIMessage[],
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  return {
    text: response.choices[0].message.content ?? '',
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Single entry point for every AI call in the system.
 * Selects provider+model by jobType, times the call, calculates cost,
 * and writes a row to ai_jobs.
 *
 * Returns the raw text from the model (JSON string for structured tasks).
 */
export async function runAIJob(
  jobType: JobType,
  messages: OAIMessage[],
  context: AIJobContext,
): Promise<string> {
  const anthropicModel = ANTHROPIC_MODELS[jobType];
  const openaiModel = OPENAI_FALLBACK_MODELS[jobType];

  let text = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let model = anthropicModel;
  let provider: 'anthropic' | 'openai' = 'anthropic';
  let errorMessage: string | undefined;
  const startMs = Date.now();

  try {
    const result = await callAnthropic(anthropicModel, messages);
    text = result.text;
    promptTokens = result.promptTokens;
    completionTokens = result.completionTokens;
  } catch (anthropicErr: unknown) {
    const msg = anthropicErr instanceof Error ? anthropicErr.message : String(anthropicErr);
    console.warn(`[ai-orchestrator] Anthropic ${anthropicModel} failed, retrying on OpenAI: ${msg}`);

    try {
      model = openaiModel;
      provider = 'openai';
      const result = await callOpenAI(openaiModel, messages);
      text = result.text;
      promptTokens = result.promptTokens;
      completionTokens = result.completionTokens;
    } catch (openaiErr: unknown) {
      const oaiMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
      errorMessage = `Anthropic: ${msg}; OpenAI: ${oaiMsg}`;
      await logJob({
        jobType, context, model, provider,
        promptTokens: 0, completionTokens: 0,
        latencyMs: Date.now() - startMs,
        status: 'error',
        inputSummary: redactedInputSummary(jobType, messages),
        output: null,
        errorMessage,
      });
      throw new Error(errorMessage);
    }
  }

  const latencyMs = Date.now() - startMs;
  const costCents = calcCostCents(model, promptTokens, completionTokens);

  let parsedOutput: unknown = null;
  try { parsedOutput = JSON.parse(text); } catch { parsedOutput = { raw: text }; }

  await logJob({
    jobType, context, model, provider,
    promptTokens, completionTokens,
    latencyMs, costCents,
    status: 'success',
    inputSummary: redactedInputSummary(jobType, messages),
    output: parsedOutput,
    errorMessage: undefined,
  });

  return text;
}

// ─── Logging helper ───────────────────────────────────────────────────────────

interface LogJobParams {
  jobType: JobType;
  context: AIJobContext;
  model: string;
  provider: 'anthropic' | 'openai';
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  costCents?: number;
  status: 'success' | 'error';
  inputSummary: Record<string, unknown>;
  output: unknown;
  errorMessage?: string;
}

async function logJob(p: LogJobParams): Promise<void> {
  try {
    await withFirmContext(p.context.firmId, (tx) =>
      tx.insert(aiJobs).values({
        firm_id: p.context.firmId,
        job_type: p.jobType,
        related_entity_type: p.context.relatedEntityType,
        related_entity_id: p.context.relatedEntityId,
        model: p.model,
        provider: p.provider,
        prompt_tokens: p.promptTokens,
        completion_tokens: p.completionTokens,
        cost_cents: p.costCents?.toFixed(4),
        latency_ms: p.latencyMs,
        status: p.status,
        input_summary: p.inputSummary,
        output: p.output as Record<string, unknown>,
        error_message: p.errorMessage,
      }),
    );
  } catch (err) {
    // Logging failure must never break the main flow.
    console.error('[ai-orchestrator] Failed to log ai_jobs row:', err);
  }
}
