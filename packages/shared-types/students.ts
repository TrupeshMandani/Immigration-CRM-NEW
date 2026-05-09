import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const StudentStatusEnum = z.enum(['pending', 'registered', 'active', 'closed']);
export const StudentStageEnum = z.enum(['lead', 'study_permit', 'pgwp', 'pr', 'citizenship']);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export const CreateStudentSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  status: StudentStatusEnum.default('registered'),
  stage: StudentStageEnum.default('lead'),
  ai_key: z.string().trim().optional(),
  profile_data: z.record(z.unknown()).default({}),
  state_data: z.record(z.unknown()).default({}),
  assigned_to: z.string().uuid().optional().nullable(),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;

// ---------------------------------------------------------------------------
// Update (all fields optional)
// ---------------------------------------------------------------------------
export const UpdateStudentSchema = z.object({
  email: z.string().email().toLowerCase().trim().optional(),
  first_name: z.string().trim().optional().nullable(),
  last_name: z.string().trim().optional().nullable(),
  status: StudentStatusEnum.optional(),
  stage: StudentStageEnum.optional(),
  profile_data: z.record(z.unknown()).optional(),
  state_data: z.record(z.unknown()).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;

// ---------------------------------------------------------------------------
// Filters for list queries
// ---------------------------------------------------------------------------
export const StudentFiltersSchema = z.object({
  status: StudentStatusEnum.optional(),
  stage: StudentStageEnum.optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type StudentFilters = z.infer<typeof StudentFiltersSchema>;
