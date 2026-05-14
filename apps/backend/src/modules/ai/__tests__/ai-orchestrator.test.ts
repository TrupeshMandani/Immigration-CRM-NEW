/**
 * AI orchestrator tests.
 *
 * Validates two key invariants:
 *  1. Prompt strings in the new module are byte-for-byte identical to the
 *     originals (asserted via SHA-256 hash against pre-computed expected values).
 *  2. A successful runAIJob call writes a row to ai_jobs with cost_cents > 0
 *     and status = 'success'.
 *
 * External AI API calls are mocked. A real Postgres DB is used so the
 * database-write assertion is meaningful.
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, withFirmContext } from '../../../db/postgres';
import { firms } from '../../../db/schema/firms';
import { aiJobs } from '../../../db/schema/ai_jobs';

// ─── Mock Anthropic SDK ───────────────────────────────────────────────────────
vi.mock('@anthropic-ai/sdk', () => {
  const fakeCreate = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: '{"status":"verified","detectedType":"Passport","confidence":0.95,"reason":"Matches passport format"}' }],
    usage: { input_tokens: 120, output_tokens: 40 },
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: fakeCreate },
    })),
  };
});

// ─── Import after mocks are set up ────────────────────────────────────────────
import { runAIJob } from '../ai-orchestrator.service';
import { VERIFY_SYSTEM_PROMPT, buildVerifyUserPrompt } from '../verification.service';
import { CLASSIFY_SYSTEM_PROMPT } from '../classifier.service';
import { buildExtractSystemPrompt } from '../extract.service';
import { RECOMMENDATION_SYSTEM_PROMPT } from '../recommendation.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// ─── Expected hashes — computed from the original JS source files ─────────────
// If any of these assertions fail, a prompt string was altered.
const EXPECTED_HASHES = {
  VERIFY_SYSTEM:
    '8c0facdf2f582750a84d0ace9bc89c447bca63fd99554dec8ab547c825cb7b01',
  CLASSIFY_SYSTEM:
    '2521d61bf6c1f14765ff4a8ff74195293c2627556b55f8b22ae7998d46f27d28',
  RECOMMEND_SYSTEM:
    '3654d46639a974b845a15b154d0ef78051636c46ae909304473e798982053e6f',
  EXTRACT_NO_SCHEMA:
    '43f4493dca8293143554daf2ce77f712ac9b00f3ed475cc28adddeabaf1acfd7',
};

// ─── Test data ────────────────────────────────────────────────────────────────
const tag = Date.now();
let firmId: string;

beforeAll(async () => {
  const [firm] = await db
    .insert(firms)
    .values({ name: `AI Test Firm ${tag}`, slug: `ai-test-${tag}` })
    .returning();
  firmId = firm.id;
});

afterAll(async () => {
  await db.delete(firms).where(eq(firms.id, firmId));
});

// ─── Prompt hash assertions ───────────────────────────────────────────────────

describe('prompt integrity', () => {
  it('VERIFY_SYSTEM_PROMPT hash matches original', () => {
    expect(sha256(VERIFY_SYSTEM_PROMPT)).toBe(EXPECTED_HASHES.VERIFY_SYSTEM);
  });

  it('CLASSIFY_SYSTEM_PROMPT hash matches original', () => {
    expect(sha256(CLASSIFY_SYSTEM_PROMPT)).toBe(EXPECTED_HASHES.CLASSIFY_SYSTEM);
  });

  it('RECOMMENDATION_SYSTEM_PROMPT hash matches original', () => {
    expect(sha256(RECOMMENDATION_SYSTEM_PROMPT)).toBe(EXPECTED_HASHES.RECOMMEND_SYSTEM);
  });

  it('buildExtractSystemPrompt("") hash matches original', () => {
    expect(sha256(buildExtractSystemPrompt(''))).toBe(EXPECTED_HASHES.EXTRACT_NO_SCHEMA);
  });
});

// ─── Orchestrator + ai_jobs write assertion ───────────────────────────────────

describe('runAIJob', () => {
  it('writes an ai_jobs row with cost_cents > 0 on success', async () => {
    const context = {
      firmId,
      relatedEntityType: 'document' as const,
      relatedEntityId: '00000000-0000-0000-0000-000000000001',
    };

    const messages = [
      { role: 'system' as const, content: VERIFY_SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: buildVerifyUserPrompt('Passport') },
          { type: 'text' as const, text: 'Extracted text:\nPassport No: AB123456' },
        ],
      },
    ];

    const resultText = await runAIJob('doc_verify', messages, context);

    // Response was returned from the mocked Anthropic SDK
    expect(typeof resultText).toBe('string');
    expect(resultText).toContain('verified');

    // Row was written to ai_jobs
    const rows = await withFirmContext(firmId, (tx) =>
      tx
        .select()
        .from(aiJobs)
        .where(eq(aiJobs.related_entity_id, '00000000-0000-0000-0000-000000000001')),
    );

    expect(rows.length).toBeGreaterThan(0);
    const row = rows[0];

    expect(row.status).toBe('success');
    expect(row.job_type).toBe('doc_verify');
    expect(row.provider).toBe('anthropic');
    expect(row.model).toBe('claude-haiku-4-5-20251001');

    // cost_cents is stored as a numeric string by Postgres; cast to number for assertion.
    const costCents = Number(row.cost_cents);
    expect(costCents).toBeGreaterThan(0);

    expect(row.prompt_tokens).toBeGreaterThan(0);
    expect(row.completion_tokens).toBeGreaterThan(0);
    expect(row.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('falls back to OpenAI and still logs when Anthropic throws', async () => {
    // Make Anthropic throw once, let OpenAI mock take over.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Anthropic = (await import('@anthropic-ai/sdk')).default as any;
    const instance = new Anthropic();
    (instance.messages.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Anthropic service unavailable'),
    );

    // Mock OpenAI for the fallback
    vi.mock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: '{"status":"pending","detectedType":"Unknown","confidence":0.3,"reason":"Fallback"}' } }],
              usage: { prompt_tokens: 80, completion_tokens: 30 },
            }),
          },
        },
      })),
    }));

    const context = {
      firmId,
      relatedEntityType: 'document' as const,
      relatedEntityId: '00000000-0000-0000-0000-000000000002',
    };

    const messages = [
      { role: 'system' as const, content: VERIFY_SYSTEM_PROMPT },
      { role: 'user' as const, content: buildVerifyUserPrompt('Passport') },
    ];

    // Should not throw — fallback to OpenAI
    const text = await runAIJob('doc_verify', messages, context);
    expect(typeof text).toBe('string');

    const rows = await withFirmContext(firmId, (tx) =>
      tx
        .select()
        .from(aiJobs)
        .where(eq(aiJobs.related_entity_id, '00000000-0000-0000-0000-000000000002')),
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].status).toBe('success');
  });
});
