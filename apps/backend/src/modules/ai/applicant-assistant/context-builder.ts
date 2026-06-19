import { and, eq, ne } from 'drizzle-orm';
import { db } from '../../../db/postgres';
import { applicants } from '../../../db/schema/applicants';
import { tasks } from '../../../db/schema/tasks';

export interface ApplicantContext {
  applicantId: string;
  firmId: string;
}

const STAGE_PROMPTS: Record<string, string> = {
  lead:          'This applicant is in early stages. Help them understand what documents to gather and what to expect from the process.',
  study_permit:  'This applicant is working toward a study permit. Focus on IRCC requirements, document deadlines, and IELTS/admission letter status.',
  pgwp:          'This applicant is pursuing a Post-Graduate Work Permit. Help with PGWP application steps after graduation from a DLI.',
  pr:            'This applicant is pursuing Permanent Residency. Focus on Express Entry, CRS score, provincial nominee programs, and PR pathway requirements.',
  citizenship:   'This applicant is working toward Canadian citizenship. Focus on physical presence calculation, language requirements (CLB 4), and the citizenship test.',
};

const STAGE_DOC_REQUIREMENTS: Record<string, string[]> = {
  lead:         ['Passport', 'Photograph'],
  study_permit: ['Passport', 'Language Test Result (IELTS)', 'Acceptance Letter', 'Proof of Funds', 'Photograph', 'Medical Examination Report'],
  pgwp:         ['Passport', 'Graduation Letter', 'Transcripts', 'Study Permit Copy'],
  pr:           ['Passport', 'Language Test Result (IELTS)', 'Educational Transcripts', 'Proof of Funds', 'Police Clearance Certificate'],
  citizenship:  ['Passport', 'PR Card', 'Physical Presence Calculator', 'Language Test Result'],
};

export { STAGE_DOC_REQUIREMENTS };

export async function buildSystemPrompt(ctx: ApplicantContext): Promise<string> {
  const [applicant] = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, ctx.applicantId), eq(applicants.firm_id, ctx.firmId)))
    .limit(1);

  if (!applicant) throw new Error('Applicant not found');

  const openTasks = await db
    .select({ id: tasks.id, title: tasks.title, due_at: tasks.due_at, status: tasks.status })
    .from(tasks)
    .where(and(
      eq(tasks.applicant_id, ctx.applicantId),
      eq(tasks.firm_id, ctx.firmId),
      ne(tasks.status, 'done'),
      ne(tasks.status, 'dismissed'),
    ))
    .limit(10);

  const docDefs = (applicant.state_data as any)?.doc_defs ?? {};
  const docSummary = Object.entries(docDefs).map(([, def]: [string, any]) => {
    const files: any[] = def.files ?? [];
    return {
      name: def.name as string,
      filesCount: files.length,
      verified: files.some((f: any) => f.verified) ?? false,
    };
  });

  const stageGuidance = STAGE_PROMPTS[applicant.stage] ?? STAGE_PROMPTS.lead;
  const displayName = applicant.first_name
    ? `${applicant.first_name} ${applicant.last_name ?? ''}`.trim()
    : applicant.email;

  return `You are an Immigration Assistant helping ${displayName}.

ABOUT THIS APPLICANT:
- Name: ${displayName}
- Email: ${applicant.email}
- Current Stage: ${applicant.stage}
- Status: ${applicant.status}
- Profile Data: ${JSON.stringify(applicant.profile_data ?? {}, null, 2)}

THEIR DOCUMENTS (${docSummary.length} document slots):
${docSummary.length
  ? docSummary.map(d => `- ${d.name}: ${d.filesCount} file(s) uploaded, verified: ${d.verified}`).join('\n')
  : '- No required documents configured yet.'}

THEIR OPEN TASKS (${openTasks.length}):
${openTasks.length
  ? openTasks.map(t => `- [${t.status}] ${t.title}${t.due_at ? ` (due: ${new Date(t.due_at).toLocaleDateString()})` : ''}`).join('\n')
  : '- No open tasks.'}

YOUR ROLE:
You are a knowledgeable, empathetic immigration assistant. Help this applicant understand their case status, next steps, and what they need to do.

${stageGuidance}

IMPORTANT RULES:
1. ONLY use the provided tools to read or update THIS applicant's data. Never mention other applicants.
2. When the applicant provides profile information (IELTS scores, passport number, dates), use the update_profile tool to save it immediately, then confirm what you saved.
3. Respond in a warm, clear, non-jargon tone. If you use legal terms, explain them in plain language.
4. If unsure about specific IRCC processing times or policy, say "Please verify current times at ircc.canada.ca" — do NOT make up timelines.
5. Keep responses concise (3–5 sentences) unless the applicant asks for more detail.
6. Always end with a clear next action item for the applicant.
7. Today's date is ${new Date().toISOString().slice(0, 10)}.`;
}
