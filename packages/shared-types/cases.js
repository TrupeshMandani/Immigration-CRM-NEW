"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseFiltersSchema = exports.UpdateCaseSchema = exports.CreateCaseSchema = exports.CASE_STATUS_LABELS = exports.CASE_TYPE_LABELS = exports.CaseStatusEnum = exports.CaseTypeEnum = void 0;
const zod_1 = require("zod");
exports.CaseTypeEnum = zod_1.z.enum([
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
exports.CaseStatusEnum = zod_1.z.enum([
    'open',
    'in_progress',
    'submitted',
    'approved',
    'rejected',
    'closed',
]);
exports.CASE_TYPE_LABELS = {
    express_entry: 'Express Entry',
    pnp: 'Provincial Nominee Program',
    family_sponsorship: 'Family Sponsorship',
    work_permit: 'Work Permit',
    lmia: 'LMIA',
    study_permit: 'Study Permit',
    pgwp: 'Post-Graduate Work Permit',
    visitor_visa: 'Visitor Visa (TRV)',
    citizenship: 'Citizenship',
    refugee_asylum: 'Refugee / Asylum',
    hc: 'Humanitarian & Compassionate',
};
exports.CASE_STATUS_LABELS = {
    open: 'Open',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    closed: 'Closed',
};
exports.CreateCaseSchema = zod_1.z.object({
    applicant_id: zod_1.z.string().min(1, 'Applicant is required'),
    case_type: exports.CaseTypeEnum,
    title: zod_1.z.string().trim().min(1, 'Title is required').max(255),
    description: zod_1.z.string().trim().optional(),
    assigned_to: zod_1.z.string().uuid().optional().nullable(),
    status: exports.CaseStatusEnum.default('open'),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.UpdateCaseSchema = zod_1.z.object({
    case_type: exports.CaseTypeEnum.optional(),
    title: zod_1.z.string().trim().min(1).max(255).optional(),
    description: zod_1.z.string().trim().optional().nullable(),
    assigned_to: zod_1.z.string().uuid().optional().nullable(),
    status: exports.CaseStatusEnum.optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.CaseFiltersSchema = zod_1.z.object({
    case_type: exports.CaseTypeEnum.optional(),
    status: exports.CaseStatusEnum.optional(),
    assigned_to: zod_1.z.string().uuid().optional(),
    applicant_id: zod_1.z.string().optional(),
    search: zod_1.z.string().trim().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
