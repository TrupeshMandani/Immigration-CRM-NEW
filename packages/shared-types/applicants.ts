import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const ApplicantStatusEnum = z.enum(['pending', 'registered', 'active', 'closed']);
export const ApplicantStageEnum = z.enum(['lead', 'study_permit', 'pgwp', 'pr', 'citizenship']);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export const CreateApplicantSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  status: ApplicantStatusEnum.default('registered'),
  stage: ApplicantStageEnum.default('lead'),
  ai_key: z.string().trim().optional(),
  profile_data: z.record(z.unknown()).default({}),
  state_data: z.record(z.unknown()).default({}),
  assigned_to: z.string().uuid().optional().nullable(),
});

export type CreateApplicantInput = z.infer<typeof CreateApplicantSchema>;

// ---------------------------------------------------------------------------
// Update (all fields optional)
// ---------------------------------------------------------------------------
export const UpdateApplicantSchema = z.object({
  email: z.string().email().toLowerCase().trim().optional(),
  first_name: z.string().trim().optional().nullable(),
  last_name: z.string().trim().optional().nullable(),
  status: ApplicantStatusEnum.optional(),
  stage: ApplicantStageEnum.optional(),
  profile_data: z.record(z.unknown()).optional(),
  state_data: z.record(z.unknown()).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export type UpdateApplicantInput = z.infer<typeof UpdateApplicantSchema>;

// ---------------------------------------------------------------------------
// Filters for list queries
// ---------------------------------------------------------------------------
export const ApplicantFiltersSchema = z.object({
  status: ApplicantStatusEnum.optional(),
  stage: ApplicantStageEnum.optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ApplicantFilters = z.infer<typeof ApplicantFiltersSchema>;
