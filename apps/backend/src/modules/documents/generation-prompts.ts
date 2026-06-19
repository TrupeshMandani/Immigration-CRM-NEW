import type { Applicant } from '../../db/schema/applicants';
import type { Firm } from '../../db/schema/firms';

export type DocType = 'sop' | 'cover_letter' | 'checklist';

export const GENERATION_SYSTEM_PROMPT = `You are an expert immigration consultant writing documents for applicants.
Write in formal but accessible English. Be specific to the applicant's actual profile — never use placeholder text like [INSERT NAME] or [PLACEHOLDER].
All documents must be ready to use with minimal editing. If a detail is not provided, write a sentence that works naturally without it.`;

export function buildGenerationPrompt(
  type: DocType,
  applicant: Applicant,
  firm: Firm,
): string {
  const profile = (applicant.profile_data ?? {}) as Record<string, unknown>;
  const name = [applicant.first_name, applicant.last_name].filter(Boolean).join(' ') || 'the applicant';

  if (type === 'sop') {
    return `Write a Statement of Purpose (SOP) for a Canadian study permit application for the following applicant.

Applicant Details:
- Full Name: ${name}
- Nationality: ${profile.Nationality ?? profile.nationality ?? 'Not provided'}
- Education: ${profile.degree ?? 'N/A'} in ${profile.field ?? 'N/A'} from ${profile.university ?? 'N/A'}
- GPA: ${profile.GPA ?? 'Not provided'}
- IELTS Overall: ${profile.IELTS_overall ?? 'Not provided'} (L:${profile.IELTS_listening ?? 'N/A'}, R:${profile.IELTS_reading ?? 'N/A'}, W:${profile.IELTS_writing ?? 'N/A'}, S:${profile.IELTS_speaking ?? 'N/A'})
- Work Experience: ${JSON.stringify(profile.Experience ?? [])}
- Target: Study permit application in Canada

Requirements:
- Length: 600–800 words
- Tone: Formal, professional, first-person
- Structure: Introduction, Why Canada, Why this Program, Future Plans, Ties to Home Country
- Do NOT use placeholder text — use the actual applicant details above
- Do NOT invent specific university or institution names unless provided`;
  }

  if (type === 'cover_letter') {
    const passport = (profile.passportDetails as any) ?? {};
    const passportNum = profile.PassportNumber ?? passport.number ?? '[Passport Number]';
    const dob = profile.DateOfBirth ?? passport.dateOfBirth ?? 'Not provided';

    return `Write a cover letter to accompany a study permit application to Immigration, Refugees and Citizenship Canada (IRCC).

Applicant Details:
- Full Name: ${name}
- Nationality: ${profile.Nationality ?? profile.nationality ?? 'Not provided'}
- Passport Number: ${passportNum}
- Date of Birth: ${dob}
- Program: Study in Canada
- Firm Represented By: ${firm.name}

Requirements:
- Length: 300–400 words
- Format: Formal letter addressed to "The Immigration Officer"
- Include: applicant's purpose of visit, intent to return home, financial ability (note it is documented separately), ties to home country
- Tone: Respectful, direct, professional
- Date the letter with today's date`;
  }

  if (type === 'checklist') {
    const stateData = (applicant.state_data ?? {}) as Record<string, unknown>;
    const docDefs = (stateData.doc_defs ?? {}) as Record<string, { name: string; files?: unknown[] }>;
    const uploadedLines = Object.values(docDefs)
      .map((d) => `${d.name}: ${Array.isArray(d.files) && d.files.length > 0 ? '✓ Uploaded' : '✗ Missing'}`)
      .join('\n');

    return `Create a personalized application checklist for the following immigration case.

Applicant: ${name}
Stage: ${applicant.stage}
Current Documents:
${uploadedLines || '(no documents yet)'}

Generate a clean, organized checklist in Markdown format that:
1. Lists all documents for the ${applicant.stage} stage, marking each as ✓ or ✗ based on uploaded status above
2. Adds any missing standard IRCC documents for the ${applicant.stage} stage not already listed
3. Includes a "Next Steps" section with 3–5 actionable items specific to this stage
4. Uses clear headings and bullet points
Keep it practical and specific to this applicant's stage.`;
  }

  throw new Error(`Unknown document type: ${type}`);
}
