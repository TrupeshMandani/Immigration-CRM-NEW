import { z } from 'zod';

export const DeadlineTypeEnum = z.enum([
  'work_permit_expiry',
  'study_permit_expiry',
  'visitor_visa_expiry',
  'pr_card_expiry',
  'passport_expiry',
  'rfe_response',
  'filing_deadline',
  'biometrics_appointment',
  'medical_exam',
  'interview_date',
  'ita_expiry',
  'copr_expiry',
  'bridging_permit_expiry',
  'lmia_expiry',
  'custom',
]);

export type DeadlineType = z.infer<typeof DeadlineTypeEnum>;

export const DEADLINE_TYPE_LABELS: Record<DeadlineType, string> = {
  work_permit_expiry:      'Work Permit Expiry',
  study_permit_expiry:     'Study Permit Expiry',
  visitor_visa_expiry:     'Visitor Visa Expiry',
  pr_card_expiry:          'PR Card Expiry',
  passport_expiry:         'Passport Expiry',
  rfe_response:            'RFE Response Deadline',
  filing_deadline:         'Application Filing Deadline',
  biometrics_appointment:  'Biometrics Appointment',
  medical_exam:            'Medical Exam Deadline',
  interview_date:          'Interview Appointment',
  ita_expiry:              'ITA Expiry (Express Entry)',
  copr_expiry:             'COPR Expiry',
  bridging_permit_expiry:  'Bridging Open Work Permit Expiry',
  lmia_expiry:             'LMIA Validity Expiry',
  custom:                  'Custom Deadline',
};

export const DEFAULT_NOTIFICATIONS: Record<DeadlineType, number[]> = {
  work_permit_expiry:      [90, 60, 30, 14, 7],
  study_permit_expiry:     [90, 60, 30, 14, 7],
  visitor_visa_expiry:     [60, 30, 14, 7],
  pr_card_expiry:          [180, 90, 60, 30],
  passport_expiry:         [180, 90, 30],
  rfe_response:            [30, 14, 7, 3, 1],
  filing_deadline:         [30, 14, 7, 3, 1],
  biometrics_appointment:  [14, 7, 3, 1],
  medical_exam:            [30, 14, 7],
  interview_date:          [14, 7, 3, 1],
  ita_expiry:              [14, 7, 3, 1],
  copr_expiry:             [90, 60, 30, 14],
  bridging_permit_expiry:  [60, 30, 14, 7],
  lmia_expiry:             [60, 30, 14, 7],
  custom:                  [30, 14, 7],
};

export const CreateDeadlineSchema = z.object({
  case_id:                  z.string().min(1),
  applicant_id:             z.string().min(1),
  deadline_type:            DeadlineTypeEnum,
  label:                    z.string().trim().min(1).max(255).optional(),
  due_date:                 z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  description:              z.string().trim().optional(),
  assigned_to:              z.string().optional().nullable(),
  days_before_notification: z.array(z.number().int().positive()).optional(),
  metadata:                 z.record(z.unknown()).default({}),
});

export const UpdateDeadlineSchema = z.object({
  deadline_type:            DeadlineTypeEnum.optional(),
  label:                    z.string().trim().min(1).max(255).optional(),
  due_date:                 z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description:              z.string().trim().optional().nullable(),
  assigned_to:              z.string().optional().nullable(),
  days_before_notification: z.array(z.number().int().positive()).optional(),
  acknowledged_at:          z.string().optional().nullable(),
  metadata:                 z.record(z.unknown()).optional(),
});

export const DeadlineFiltersSchema = z.object({
  case_id:        z.string().optional(),
  applicant_id:   z.string().optional(),
  assigned_to:    z.string().optional(),
  deadline_type:  DeadlineTypeEnum.optional(),
  unacknowledged: z.coerce.boolean().default(false),
  urgency:        z.enum(['overdue', 'critical', 'warning', 'upcoming', 'future']).optional(),
  from_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit:          z.coerce.number().int().min(1).max(500).default(100),
  offset:         z.coerce.number().int().min(0).default(0),
});

export type CreateDeadlineInput = z.input<typeof CreateDeadlineSchema>;
export type UpdateDeadlineInput = z.input<typeof UpdateDeadlineSchema>;
export type DeadlineFilters     = z.infer<typeof DeadlineFiltersSchema>;
