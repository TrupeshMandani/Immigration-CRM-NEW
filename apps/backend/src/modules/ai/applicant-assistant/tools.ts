import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../../../db/postgres';
import { applicants } from '../../../db/schema/applicants';
import { tasks } from '../../../db/schema/tasks';
import { STAGE_DOC_REQUIREMENTS } from './context-builder';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processRequiredDocumentUpload, createDocumentSlug } = require('../../applicants/applicant.controller');

// ─── Tool field whitelist (prevents overwriting system fields) ────────────────

const ALLOWED_PROFILE_FIELDS = new Set([
  'IELTS_overall', 'IELTS_listening', 'IELTS_reading', 'IELTS_writing', 'IELTS_speaking',
  'TOEFL_score', 'PTE_score', 'GPA',
  'PassportNumber', 'DateOfBirth', 'Nationality', 'ExpiryDate',
  'university', 'degree', 'field',
  'phone', 'address',
  'overallScore', 'listeningScore', 'readingScore', 'writingScore', 'speakingScore',
]);

// ─── Tool schema definitions (OpenAI function-calling format) ─────────────────

export const APPLICANT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_profile',
      description: "Get the applicant's current profile data including all stored fields.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_profile',
      description:
        "Update a specific field in the applicant's profile_data. Use this when the applicant provides profile information such as IELTS scores, passport number, date of birth, GPA, university, etc.",
      parameters: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            description: 'The profile_data field key to update, e.g. "IELTS_overall", "PassportNumber", "GPA"',
          },
          value: {
            description: 'The value to set. Use a number for scores/GPA, string for text fields.',
          },
        },
        required: ['field', 'value'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_documents',
      description: "List all required document slots for the applicant with their upload and verification status.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_tasks',
      description: "List the applicant's current open tasks.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_stage_requirements',
      description: "Get the list of required documents and steps for the applicant's current immigration stage.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'upload_document',
      description:
        "Upload the file attached to this chat message into the applicant's required documents. " +
        'Only call this tool when: (1) the applicant attached a file in this message, AND ' +
        '(2) the applicant has explicitly stated or confirmed what type of document it is. ' +
        'Do NOT call this tool if no file was attached. Do NOT guess the document type — ask first if unsure.',
      parameters: {
        type: 'object',
        properties: {
          documentType: {
            type: 'string',
            description:
              "The document type name. Use the closest matching name from the applicant's required documents list. " +
              'E.g. "Language Test Result (IELTS)", "Passport", "Proof of Funds", "Acceptance Letter". ' +
              'If the exact name is unknown, use the closest natural match.',
          },
          confirmedByApplicant: {
            type: 'boolean',
            description:
              'true if the applicant explicitly stated what this document is in their message. ' +
              'false if you are inferring — in that case, ask first instead of uploading.',
          },
        },
        required: ['documentType', 'confirmedByApplicant'],
      },
    },
  },
] as const;

// ─── Tool executor ────────────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  applicantId: string,
  firmId: string,
  chatFile?: Express.Multer.File | null,
): Promise<string> {
  switch (toolName) {

    case 'get_profile': {
      const [row] = await db
        .select({ profile_data: applicants.profile_data })
        .from(applicants)
        .where(and(eq(applicants.id, applicantId), eq(applicants.firm_id, firmId)))
        .limit(1);
      return JSON.stringify(row?.profile_data ?? {});
    }

    case 'update_profile': {
      const { field, value } = toolInput;
      if (!ALLOWED_PROFILE_FIELDS.has(field)) {
        return `Field "${field}" cannot be updated via chat.`;
      }
      await db.execute(sql`
        UPDATE applicants
        SET profile_data = jsonb_set(COALESCE(profile_data, '{}'), ${[field]}, ${JSON.stringify(value)}::jsonb),
            updated_at = now()
        WHERE id = ${applicantId} AND firm_id = ${firmId}
      `);
      return `Updated ${field} to ${JSON.stringify(value)}`;
    }

    case 'list_documents': {
      const [row] = await db
        .select({ state_data: applicants.state_data })
        .from(applicants)
        .where(and(eq(applicants.id, applicantId), eq(applicants.firm_id, firmId)))
        .limit(1);
      const docDefs = (row?.state_data as any)?.doc_defs ?? {};
      const summary = Object.entries(docDefs).map(([slug, def]: any) => ({
        slug,
        name: def.name,
        filesCount: (def.files ?? []).length,
        verified: (def.files ?? []).some((f: any) => f.verified) ?? false,
      }));
      return JSON.stringify(summary);
    }

    case 'list_tasks': {
      const rows = await db
        .select({ id: tasks.id, title: tasks.title, status: tasks.status, due_at: tasks.due_at })
        .from(tasks)
        .where(and(
          eq(tasks.applicant_id, applicantId),
          eq(tasks.firm_id, firmId),
          ne(tasks.status, 'done'),
          ne(tasks.status, 'dismissed'),
        ))
        .limit(10);
      return JSON.stringify(rows);
    }

    case 'get_stage_requirements': {
      const [row] = await db
        .select({ stage: applicants.stage })
        .from(applicants)
        .where(and(eq(applicants.id, applicantId), eq(applicants.firm_id, firmId)))
        .limit(1);
      const stage = row?.stage ?? 'lead';
      return JSON.stringify({ stage, requiredDocuments: STAGE_DOC_REQUIREMENTS[stage] ?? [] });
    }

    case 'upload_document': {
      if (!chatFile?.path) {
        return 'No file was attached to this message. Please ask the applicant to attach the file they want to upload.';
      }
      if (!toolInput.confirmedByApplicant) {
        return 'Document type was not confirmed by the applicant. Ask the applicant to confirm what this document is before uploading.';
      }
      const documentType: string = (toolInput.documentType ?? '').trim();
      if (!documentType) return 'documentType is required.';

      const [applicant] = await db
        .select()
        .from(applicants)
        .where(and(eq(applicants.id, applicantId), eq(applicants.firm_id, firmId)))
        .limit(1);
      if (!applicant) return 'Applicant not found.';

      const defs: Record<string, any> = { ...((applicant.state_data as any)?.doc_defs ?? {}) };

      let slug: string;
      let defData: any;
      const matchEntry = Object.entries(defs).find(
        ([, d]: any) => (d.name as string).toLowerCase() === documentType.toLowerCase(),
      );

      if (matchEntry) {
        [slug, defData] = matchEntry;
      } else {
        slug = createDocumentSlug(documentType);
        defData = {
          name: documentType,
          description: '',
          slug,
          aiExtractionEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const newStateData = { ...((applicant.state_data as any) ?? {}), doc_defs: { ...defs, [slug]: defData } };
        await db
          .update(applicants)
          .set({ state_data: newStateData, updated_at: new Date() })
          .where(and(eq(applicants.id, applicantId), eq(applicants.firm_id, firmId)));
      }

      try {
        const { docRow, verificationResult, extractedProfile } = await processRequiredDocumentUpload({
          applicant,
          slug,
          defData,
          file: chatFile,
          uploadOptions: {
            fileSource: 'chat',
            // uploaded_by FKs to `users` (firm staff). An applicant's id lives in the
            // separate `applicants` table, so leave it null and record the role instead.
            uploadedBy: null,
            uploadedByRole: 'applicant',
            skipVerification: false,
            skipExtraction: false,
          },
        });

        const renamedTo: string = docRow.ai_verification?.name ?? chatFile.originalname;
        const extractedSummary =
          extractedProfile && Object.keys(extractedProfile).length > 0
            ? Object.entries(extractedProfile)
                .slice(0, 6)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')
            : null;

        return JSON.stringify({
          success: true,
          documentName: defData.name,
          renamedTo,
          verificationStatus: verificationResult.status,
          documentId: docRow.id,
          extractedFields: extractedSummary,
          message: extractedSummary
            ? `Uploaded as "${renamedTo}". Extracted: ${extractedSummary}. Verification: ${verificationResult.status}.`
            : `Uploaded as "${renamedTo}". Verification status: ${verificationResult.status}.`,
        });
      } catch (err: any) {
        return JSON.stringify({ success: false, error: err.message ?? 'Upload failed.' });
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}
