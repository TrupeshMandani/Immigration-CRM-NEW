import { z } from 'zod';

export const GenerateUploadUrlSchema = z.object({
  studentId: z.string().uuid('studentId must be a valid UUID'),
  documentType: z.string().trim().min(1, 'documentType is required'),
  fileName: z.string().trim().min(1, 'fileName is required'),
  mimeType: z.string().trim().min(1, 'mimeType is required'),
  sizeBytes: z.number().int().positive('sizeBytes must be a positive integer'),
});

export type GenerateUploadUrlInput = z.infer<typeof GenerateUploadUrlSchema>;
