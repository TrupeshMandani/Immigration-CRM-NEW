"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateUploadUrlSchema = void 0;
const zod_1 = require("zod");
exports.GenerateUploadUrlSchema = zod_1.z.object({
    applicantId: zod_1.z.string().uuid('applicantId must be a valid UUID'),
    documentType: zod_1.z.string().trim().min(1).optional().nullable().default(null),
    fileName: zod_1.z.string().trim().min(1, 'fileName is required'),
    mimeType: zod_1.z.string().trim().min(1, 'mimeType is required'),
    sizeBytes: zod_1.z.number().int().positive('sizeBytes must be a positive integer'),
});
