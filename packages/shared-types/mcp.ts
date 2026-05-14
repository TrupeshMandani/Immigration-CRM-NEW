/**
 * Zod schemas for every MCP tool's input and output payloads.
 *
 * Schema reconciliation note
 * --------------------------
 * zod-to-json-schema adds "additionalProperties": false to every object
 * schema, while the hand-written schemas in the tool files omit that
 * field.  Per the project spec, the LLM-facing schemas (in the tool files)
 * are the source of truth, so the generated JSON is used only for
 * TypeScript type-checking — never as a replacement for the existing
 * JSON schemas already registered with the model.
 */

import { z } from 'zod';

// ─── Student Tools ────────────────────────────────────────────────────────────

export const GetStudentByIdInput = z.object({
  studentId: z.string().describe('Unique student identifier from the CRM backend.'),
});

export const SearchStudentsInput = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Keyword used to match against student records. Leave blank to list all students.',
    ),
});

export const GetStudentMissingDocumentsInput = z.object({
  studentId: z.string().describe('Unique student identifier from the CRM backend.'),
});

export const UpdateStudentStageInput = z.object({
  studentId: z.string().describe('Unique student identifier from the CRM backend.'),
  newStage: z.string().describe('New stage value to assign to the student.'),
});

export const AddStudentNoteInput = z.object({
  studentId: z.string().describe('Unique student identifier from the CRM backend.'),
  noteText: z.string().describe('Content of the note to append to the student record.'),
});

export const GetStudentOverviewInput = z.object({
  studentId: z.string().describe('Unique student identifier from the CRM backend.'),
});

// ─── Document Tools ───────────────────────────────────────────────────────────

export const UploadDocumentInput = z.object({
  aiKey: z.string().describe("Student's unique AI key identifier"),
  documentType: z
    .string()
    .describe("Type of document (e.g., 'Passport', 'Resume', 'IELTS Result')"),
  filePath: z.string().describe('Path to the file to upload'),
});

export const GetStudentDocumentsInput = z.object({
  aiKey: z.string().describe("Student's unique AI key identifier"),
});

export const GetDocumentByIdInput = z.object({
  aiKey: z.string().describe("Student's unique AI key identifier"),
  docId: z.string().describe('Required document ID'),
  fileId: z.string().describe('File ID to retrieve'),
});

export const VerifyDocumentInput = z.object({
  aiKey: z.string().describe("Student's unique AI key identifier"),
  docId: z.string().describe('Required document ID'),
  fileId: z.string().describe('File ID to verify'),
  verified: z.boolean().optional().describe('Verification status (true/false)'),
  notes: z.string().optional().describe('Optional verification notes'),
});

export const RenameDocumentInput = z.object({
  aiKey: z.string().describe("Student's unique AI key identifier"),
  documentId: z.string().describe('Document ID to rename'),
  newName: z.string().describe('New document name'),
});

export const GetRequiredDocumentsInput = z.object({
  aiKey: z.string().describe("Student's unique AI key identifier"),
});

export const DeleteDocumentInput = z.object({
  aiKey: z.string().describe("Student's unique AI key identifier"),
  documentName: z
    .string()
    .optional()
    .describe(
      "Document name to delete (e.g., 'Passport', 'passport', 'IELTS'). " +
        'REQUIRED when user asks to delete by name. The system will automatically ' +
        'search all documents, find the matching one, and delete it. Use this ' +
        "parameter when the user says 'delete passport' or similar.",
    ),
  documentId: z
    .string()
    .optional()
    .describe(
      'Required document ID to delete. Only use this if you already have the exact ' +
        'document ID. Otherwise, use documentName instead.',
    ),
});

// ─── Email Tools ──────────────────────────────────────────────────────────────

export const SendEmailInput = z.object({
  to: z.string().describe('Recipient email address (e.g., trupesh@example.com)'),
  subject: z.string().describe('Subject line for the email.'),
  body: z
    .string()
    .describe('Plain text body of the email describing why you are reaching out.'),
  html: z.string().optional().describe('Optional HTML body for the email.'),
});

// ─── Task Tools ───────────────────────────────────────────────────────────────

export const GetTasksForStudentInput = z.object({
  studentId: z.string().describe('Unique student identifier from the CRM backend.'),
});

export const CreateStudentTaskInput = z.object({
  studentId: z
    .string()
    .describe('Unique student identifier (aiKey) from the CRM backend.'),
  title: z.string().describe("Short title for the task (e.g., 'Upload passport')."),
  description: z.string().optional().describe('Detailed instructions for the student.'),
  dueDate: z.string().optional().describe('Due date in ISO format (optional).'),
  attachmentPath: z
    .string()
    .optional()
    .describe('Absolute path to a local file to attach (optional; file must exist).'),
});

export const UpdateStudentTaskStatusInput = z.object({
  studentId: z.string().describe('Student identifier (aiKey).'),
  taskId: z.string().describe('Task ID returned by the backend.'),
  status: z.string().describe("New status value such as 'completed' or 'pending'."),
  notes: z.string().optional().describe('Optional notes recorded alongside the update.'),
});

export const DeleteStudentTaskInput = z.object({
  studentId: z.string().describe('Student identifier (aiKey).'),
  taskId: z.string().describe('Task ID to delete.'),
});

// ─── Output schemas ───────────────────────────────────────────────────────────

export const StandardSuccessOutput = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

export const GetStudentDocumentsOutput = z.object({
  success: z.boolean(),
  files: z.array(z.unknown()),
  totalFiles: z.number(),
});

export const GetDocumentByIdOutput = z.object({
  success: z.boolean(),
  url: z.string(),
  data: z.unknown(),
});

export const GetRequiredDocumentsOutput = z.object({
  success: z.boolean(),
  requiredDocuments: z.array(z.unknown()),
});

export const SendEmailOutput = z.object({
  success: z.boolean(),
  summary: z.string(),
  messageId: z.string(),
  notification: z.object({
    type: z.string(),
    message: z.string(),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type GetStudentByIdInput = z.infer<typeof GetStudentByIdInput>;
export type SearchStudentsInput = z.infer<typeof SearchStudentsInput>;
export type GetStudentMissingDocumentsInput = z.infer<typeof GetStudentMissingDocumentsInput>;
export type UpdateStudentStageInput = z.infer<typeof UpdateStudentStageInput>;
export type AddStudentNoteInput = z.infer<typeof AddStudentNoteInput>;
export type GetStudentOverviewInput = z.infer<typeof GetStudentOverviewInput>;

export type UploadDocumentInput = z.infer<typeof UploadDocumentInput>;
export type GetStudentDocumentsInput = z.infer<typeof GetStudentDocumentsInput>;
export type GetDocumentByIdInput = z.infer<typeof GetDocumentByIdInput>;
export type VerifyDocumentInput = z.infer<typeof VerifyDocumentInput>;
export type RenameDocumentInput = z.infer<typeof RenameDocumentInput>;
export type GetRequiredDocumentsInput = z.infer<typeof GetRequiredDocumentsInput>;
export type DeleteDocumentInput = z.infer<typeof DeleteDocumentInput>;

export type SendEmailInput = z.infer<typeof SendEmailInput>;

export type GetTasksForStudentInput = z.infer<typeof GetTasksForStudentInput>;
export type CreateStudentTaskInput = z.infer<typeof CreateStudentTaskInput>;
export type UpdateStudentTaskStatusInput = z.infer<typeof UpdateStudentTaskStatusInput>;
export type DeleteStudentTaskInput = z.infer<typeof DeleteStudentTaskInput>;
