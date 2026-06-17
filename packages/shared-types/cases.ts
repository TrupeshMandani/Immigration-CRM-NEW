import { z } from 'zod';

export const CaseTypeEnum = z.enum([
  'express_entry',
  'pnp',
  'family_sponsorship',
  'work_permit',
  'lmia',
  'study_permit',
  'pgwp',
  'visitor_visa',
  'citizenship',
  'refugee_asylum',
  'hc',
]);

export const CaseStatusEnum = z.enum([
  'open',
  'in_progress',
  'submitted',
  'approved',
  'rejected',
  'closed',
]);

export const CASE_TYPE_LABELS: Record<z.infer<typeof CaseTypeEnum>, string> = {
  express_entry:      'Express Entry',
  pnp:                'Provincial Nominee Program',
  family_sponsorship: 'Family Sponsorship',
  work_permit:        'Work Permit',
  lmia:               'LMIA',
  study_permit:       'Study Permit',
  pgwp:               'Post-Graduate Work Permit',
  visitor_visa:       'Visitor Visa (TRV)',
  citizenship:        'Citizenship',
  refugee_asylum:     'Refugee / Asylum',
  hc:                 'Humanitarian & Compassionate',
};

export const CASE_STATUS_LABELS: Record<z.infer<typeof CaseStatusEnum>, string> = {
  open:        'Open',
  in_progress: 'In Progress',
  submitted:   'Submitted',
  approved:    'Approved',
  rejected:    'Rejected',
  closed:      'Closed',
};

export const CreateCaseSchema = z.object({
  applicant_id: z.string().min(1, 'Applicant is required'),
  case_type:    CaseTypeEnum,
  title:        z.string().trim().min(1, 'Title is required').max(255),
  description:  z.string().trim().optional(),
  assigned_to:  z.string().uuid().optional().nullable(),
  status:       CaseStatusEnum.default('open'),
  metadata:     z.record(z.unknown()).default({}),
});

export const UpdateCaseSchema = z.object({
  case_type:   CaseTypeEnum.optional(),
  title:       z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  status:      CaseStatusEnum.optional(),
  metadata:    z.record(z.unknown()).optional(),
});

export const CaseFiltersSchema = z.object({
  case_type:    CaseTypeEnum.optional(),
  status:       CaseStatusEnum.optional(),
  assigned_to:  z.string().uuid().optional(),
  applicant_id: z.string().optional(),
  search:       z.string().trim().optional(),
  limit:        z.coerce.number().int().min(1).max(200).default(50),
  offset:       z.coerce.number().int().min(0).default(0),
});

export type CaseType         = z.infer<typeof CaseTypeEnum>;
export type CaseStatus       = z.infer<typeof CaseStatusEnum>;
export type CreateCaseInput  = z.input<typeof CreateCaseSchema>;
export type UpdateCaseInput  = z.input<typeof UpdateCaseSchema>;
export type CaseFilters      = z.infer<typeof CaseFiltersSchema>;
