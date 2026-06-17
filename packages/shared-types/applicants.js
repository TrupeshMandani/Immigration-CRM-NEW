"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicantFiltersSchema = exports.UpdateApplicantSchema = exports.CreateApplicantSchema = exports.ApplicantStageEnum = exports.ApplicantStatusEnum = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
exports.ApplicantStatusEnum = zod_1.z.enum(['pending', 'registered', 'active', 'closed']);
exports.ApplicantStageEnum = zod_1.z.enum(['lead', 'study_permit', 'pgwp', 'pr', 'citizenship']);
// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
exports.CreateApplicantSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address').toLowerCase().trim(),
    first_name: zod_1.z.string().trim().optional(),
    last_name: zod_1.z.string().trim().optional(),
    status: exports.ApplicantStatusEnum.default('registered'),
    stage: exports.ApplicantStageEnum.default('lead'),
    ai_key: zod_1.z.string().trim().optional(),
    profile_data: zod_1.z.record(zod_1.z.unknown()).default({}),
    state_data: zod_1.z.record(zod_1.z.unknown()).default({}),
    assigned_to: zod_1.z.string().uuid().optional().nullable(),
});
// ---------------------------------------------------------------------------
// Update (all fields optional)
// ---------------------------------------------------------------------------
exports.UpdateApplicantSchema = zod_1.z.object({
    email: zod_1.z.string().email().toLowerCase().trim().optional(),
    first_name: zod_1.z.string().trim().optional().nullable(),
    last_name: zod_1.z.string().trim().optional().nullable(),
    status: exports.ApplicantStatusEnum.optional(),
    stage: exports.ApplicantStageEnum.optional(),
    profile_data: zod_1.z.record(zod_1.z.unknown()).optional(),
    state_data: zod_1.z.record(zod_1.z.unknown()).optional(),
    assigned_to: zod_1.z.string().uuid().optional().nullable(),
});
// ---------------------------------------------------------------------------
// Filters for list queries
// ---------------------------------------------------------------------------
exports.ApplicantFiltersSchema = zod_1.z.object({
    status: exports.ApplicantStatusEnum.optional(),
    stage: exports.ApplicantStageEnum.optional(),
    search: zod_1.z.string().trim().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
