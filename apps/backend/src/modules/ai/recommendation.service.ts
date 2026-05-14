import { runAIJob, type OAIMessage, type AIJobContext } from './ai-orchestrator.service';

// ─── Prompts (verbatim from AI/ai-recommendation/aiRecommendation.service.js) ──
export const RECOMMENDATION_SYSTEM_PROMPT = `
You are an AI university admissions recommender.
You MUST return output in valid JSON format that strictly matches this schema:

{
  "universities": [
    {
      "name": "string",
      "country": "string",
      "program": "string",
      "degreeLevel": "string",
      "eligibilityReason": "string",
      "tuitionFee": number,
      "aiScore": number,
      "website": "string"
    }
  ]
}

Do not rename the "universities" key.
Do not wrap it in any extra objects.
Do not include any commentary, text, or explanation outside the JSON object.
If you cannot produce valid data, return {"universities": []}.
`;

export function buildRecommendationUserPrompt(profile: Record<string, unknown>): string {
  return `Student Profile JSON:\n${JSON.stringify(profile, null, 2)}\n
Constraints:
- Provide 5–10 university options.
- Higher aiScore for closer matches to GPA, IELTS/TOEFL/PTE, and budget.
- Include real universities where possible.
- TuitionFee is yearly (in CAD or equivalent).
- Keep explanations short and factual.`;
}

// ─── Fallback list (verbatim from AI/ai-recommendation/aiRecommendation.service.js) ──

const FALLBACK_UNIVERSITIES = [
  {
    name: 'Global Institute of Applied Sciences',
    country: 'Canada',
    program: 'Applied Sciences',
    degreeLevel: 'Masters',
    eligibilityReason: 'Strong academic profile and interest in applied sciences',
    tuitionFee: 24000,
    aiScore: 0.68,
    website: 'https://www.studyincanada.com',
  },
  {
    name: 'International School of Business & Technology',
    country: 'United States',
    program: 'Business & Technology Management',
    degreeLevel: 'Masters',
    eligibilityReason: 'Matches business and technology focus with available budget range',
    tuitionFee: 28500,
    aiScore: 0.65,
    website: 'https://www.studyintheusa.com',
  },
  {
    name: 'Metropolitan College of Innovation',
    country: 'United Kingdom',
    program: 'Innovation and Entrepreneurship',
    degreeLevel: 'Diploma',
    eligibilityReason: 'Suitable for students exploring entrepreneurial pathways',
    tuitionFee: 18000,
    aiScore: 0.62,
    website: 'https://www.studyuk.britishcouncil.org',
  },
];

function buildFallbackUniversities(profile: Record<string, unknown>) {
  const country =
    (profile.countryPreference as string) ||
    (profile.country as string) ||
    (profile.nationality as string) ||
    'Canada';
  const field =
    (profile.fieldOfStudy as string) ||
    (profile.program as string) ||
    (profile.degree as string) ||
    (profile.major as string) ||
    'International Studies';
  const degree = (profile.degreeLevel as string) || 'Masters';

  return FALLBACK_UNIVERSITIES.map((item, index) => ({
    ...item,
    name: index === 0 ? `${country} Institute of ${field}` : item.name,
    country: index === 0 ? country : item.country,
    program: index === 0 ? `${field} ${degree}` : item.program,
    degreeLevel: degree,
    eligibilityReason:
      index === 0
        ? `Recommended based on your interest in ${field} and preference for ${country}.`
        : item.eligibilityReason,
  }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface University {
  name: string;
  country: string;
  program: string;
  degreeLevel: string;
  eligibilityReason: string;
  tuitionFee: number | null;
  aiScore: number;
  website: string;
}

export interface RecommendationResult {
  universities: University[];
  source: 'ai' | 'fallback';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateUniversityListFromProfile(
  profile: Record<string, unknown>,
  context: AIJobContext,
): Promise<RecommendationResult> {
  if (!profile || Object.keys(profile).length === 0) {
    return { universities: [], source: 'fallback' };
  }

  const messages: OAIMessage[] = [
    { role: 'system', content: RECOMMENDATION_SYSTEM_PROMPT },
    { role: 'user', content: buildRecommendationUserPrompt(profile) },
  ];

  // First attempt
  let raw: string;
  try {
    raw = await runAIJob('recommendation', messages, context);
  } catch {
    return { universities: buildFallbackUniversities(profile), source: 'fallback' };
  }

  let parsed: University[] = [];
  try {
    const maybe = JSON.parse(raw) as { universities?: unknown[] };
    if (Array.isArray(maybe.universities)) {
      parsed = maybe.universities as University[];
    } else {
      // Retry with explicit correction prompt (verbatim from original)
      const retryPrompt =
        RECOMMENDATION_SYSTEM_PROMPT +
        `
Your previous response was invalid.
You must return a JSON object containing only one key: "universities" (array).
Retry now.`;

      const retryMessages: OAIMessage[] = [
        { role: 'system', content: retryPrompt },
        { role: 'user', content: buildRecommendationUserPrompt(profile) },
      ];

      try {
        const retryRaw = await runAIJob('recommendation', retryMessages, context);
        const retryParsed = JSON.parse(retryRaw) as { universities?: unknown[] };
        parsed = Array.isArray(retryParsed.universities) ? (retryParsed.universities as University[]) : [];
      } catch {
        parsed = [];
      }
    }
  } catch {
    parsed = [];
  }

  if (!parsed.length) {
    return { universities: buildFallbackUniversities(profile), source: 'fallback' };
  }

  const normalized: University[] = parsed.map((x) => ({
    name: x.name || '',
    country: x.country || '',
    program: x.program || '',
    degreeLevel: x.degreeLevel || '',
    eligibilityReason: x.eligibilityReason || '',
    tuitionFee: typeof x.tuitionFee === 'number' && Number.isFinite(x.tuitionFee) ? x.tuitionFee : null,
    aiScore: typeof x.aiScore === 'number' ? Math.min(Math.max(x.aiScore, 0), 1) : 0,
    website: x.website || '',
  }));

  return { universities: normalized, source: 'ai' };
}
