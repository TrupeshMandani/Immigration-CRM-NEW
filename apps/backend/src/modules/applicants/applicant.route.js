const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const ctrl = require("./applicant.controller");
const {
  authenticateToken,
  requireAdmin,
  requireApplicant,
} = require("../../middleware/auth");
const { handleApplicantChat, getChatHistory } = require("../ai/applicant-assistant/index");
const { deleteLocalFile } = require("../s3/s3.service");
const {
  generateDocument,
  listGeneratedDocuments,
  getGeneratedDocumentUrl,
} = require("../documents/document-generation.service");

const uploadDir = path.join(__dirname, "../../tmp/required-docs");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// Admin convenience routes
router.get(
  "/registered",
  authenticateToken,
  requireAdmin,
  ctrl.getRegisteredApplicants
);

// Public routes (for applicants to access their own data)
router.put(
  "/me/profile",
  authenticateToken,
  requireApplicant,
  ctrl.updateSelfProfile
);
router.get("/:aiKey/files", authenticateToken, ctrl.getApplicantFiles);
router.post(
  "/:aiKey/documents/:documentId/rename",
  authenticateToken,
  ctrl.renameApplicantDocument
);
router.delete(
  "/:aiKey/documents/:documentId",
  authenticateToken,
  ctrl.deleteApplicantDocument
);

// Admin-only routes
router.post("/", authenticateToken, requireAdmin, ctrl.createApplicant);
router.get("/", authenticateToken, requireAdmin, ctrl.getAllApplicants);
router.get(
  "/pending/contacts",
  authenticateToken,
  requireAdmin,
  ctrl.getPendingContacts
);
router.get("/admin/:id", authenticateToken, requireAdmin, ctrl.getApplicantById);
router.post(
  "/:id/approve-contact",
  authenticateToken,
  requireAdmin,
  ctrl.approveContactRequest
);
router.post(
  "/:id/activate",
  authenticateToken,
  requireAdmin,
  ctrl.activateApplicant
);
router.post(
  "/:id/invite",
  authenticateToken,
  requireAdmin,
  ctrl.inviteApplicant
);
router.put("/:id", authenticateToken, requireAdmin, ctrl.updateApplicant);
router.delete("/:id", authenticateToken, requireAdmin, ctrl.deleteApplicant);
// Required Documents management
router.get(
  "/:aiKey/required-documents",
  authenticateToken,
  ctrl.getRequiredDocuments
);
router.post(
  "/:aiKey/required-documents",
  authenticateToken,
  requireAdmin,
  ctrl.addRequiredDocument
);
router.delete(
  "/:aiKey/required-documents/:docId",
  authenticateToken,
  requireAdmin,
  ctrl.deleteRequiredDocument
);
router.patch(
  "/:aiKey/required-documents/:docId",
  authenticateToken,
  requireAdmin,
  ctrl.updateRequiredDocumentSettings
);
// Unified upload route: accepts either docId (URL param) or documentType (body param)
// Route 1: Manual upload with docId
router.post(
  "/:aiKey/required-documents/:docId/files",
  authenticateToken,
  upload.single("file"),
  ctrl.uploadRequiredDocumentFile
);
// Route 2: AI/system upload with documentType (no docId required)
router.post(
  "/:aiKey/required-documents/files",
  authenticateToken,
  upload.single("file"),
  ctrl.uploadRequiredDocumentFile
);
router.get(
  "/:aiKey/required-documents/:docId/files",
  authenticateToken,
  ctrl.listRequiredDocumentFiles
);
router.get(
  "/:aiKey/required-documents/:docId/files/:fileId/url",
  authenticateToken,
  ctrl.getRequiredDocumentFileUrl
);
router.delete(
  "/:aiKey/required-documents/:docId/files/:fileId",
  authenticateToken,
  ctrl.deleteRequiredDocumentFile
);
router.post(
  "/:aiKey/required-documents/:docId/files/:fileId/verify",
  authenticateToken,
  requireAdmin,
  ctrl.verifyRequiredDocumentFile
);
router.post(
  "/:aiKey/required-documents/:docId/files/:fileId/reject",
  authenticateToken,
  requireAdmin,
  ctrl.rejectRequiredDocumentFile
);
router.get("/:aiKey/tasks", authenticateToken, ctrl.listApplicantTasks);
router.post(
  "/:aiKey/tasks",
  authenticateToken,
  requireAdmin,
  upload.single("attachment"),
  ctrl.createApplicantTask
);
router.patch(
  "/:aiKey/tasks/:taskId",
  authenticateToken,
  ctrl.updateApplicantTask
);
router.get(
  "/:aiKey/tasks/:taskId/attachment",
  authenticateToken,
  ctrl.getApplicantTaskAttachmentUrl
);
router.delete(
  "/:aiKey/tasks/:taskId",
  authenticateToken,
  ctrl.deleteApplicantTask
);
// ─── Applicant AI Assistant ───────────────────────────────────────────────────

const ALLOWED_CHAT_MIMETYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_CHAT_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

router.post(
  "/:aiKey/chat",
  authenticateToken,
  requireApplicant,
  upload.single("file"),
  async (req, res) => {
    const { aiKey } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      if (req.file) deleteLocalFile(req.file.path);
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > 2000) {
      if (req.file) deleteLocalFile(req.file.path);
      return res.status(400).json({ error: "message too long (max 2000 chars)" });
    }
    if (req.file) {
      if (!ALLOWED_CHAT_MIMETYPES.has(req.file.mimetype)) {
        deleteLocalFile(req.file.path);
        return res.status(415).json({ error: "Unsupported file type. Attach PDF, JPG, PNG, WEBP, DOC or DOCX." });
      }
      if (req.file.size > MAX_CHAT_FILE_BYTES) {
        deleteLocalFile(req.file.path);
        return res.status(413).json({ error: "File too large (max 25 MB)." });
      }
    }

    const firmId = req.context?.firmId;
    await handleApplicantChat(aiKey, firmId, message.trim(), req.file ?? null, res);
  }
);

router.get(
  "/:aiKey/chat/history",
  authenticateToken,
  requireApplicant,
  async (req, res) => {
    try {
      const isOwner =
        req.user?.role === "applicant" &&
        (req.user?.ai_key || req.user?.aiKey) === req.params.aiKey;
      if (!isOwner) return res.status(403).json({ error: "Access denied" });

      const history = await getChatHistory(req.userId);
      res.json({ messages: history.reverse() });
    } catch (err) {
      console.error("[chat-history]", err);
      res.status(500).json({ error: "Failed to load chat history" });
    }
  }
);

// ─── Document Generation ──────────────────────────────────────────────────────

const VALID_DOC_TYPES = new Set(['sop', 'cover_letter', 'checklist']);

// Resolve applicant from aiKey and verify ownership (admin or own applicant)
async function resolveApplicantForGeneration(req, res) {
  const { db } = require('../../db/postgres');
  const { applicants } = require('../../db/schema');
  const { eq } = require('drizzle-orm');

  const [applicant] = await db
    .select()
    .from(applicants)
    .where(eq(applicants.ai_key, req.params.aiKey))
    .limit(1);

  if (!applicant) {
    res.status(404).json({ message: 'Applicant not found' });
    return null;
  }

  const isAdmin = ['admin', 'senior', 'junior'].includes(req.userRole);
  const isOwner =
    req.userRole === 'applicant' &&
    (req.user?.ai_key || req.user?.aiKey) === req.params.aiKey;

  if (!isAdmin && !isOwner) {
    res.status(403).json({ message: 'Access denied' });
    return null;
  }

  return applicant;
}

// POST /:aiKey/generate-document  { type: 'sop' | 'cover_letter' | 'checklist' }
router.post(
  "/:aiKey/generate-document",
  authenticateToken,
  async (req, res) => {
    try {
      const { type } = req.body;
      if (!type || !VALID_DOC_TYPES.has(type)) {
        return res.status(400).json({ message: 'Invalid document type. Must be sop, cover_letter, or checklist.' });
      }

      const applicant = await resolveApplicantForGeneration(req, res);
      if (!applicant) return;

      const firmId = req.context?.firmId || process.env.DEFAULT_FIRM_ID;
      await generateDocument(applicant.id, firmId, type, res);
    } catch (err) {
      const statusCode = err.statusCode ?? 500;
      if (!res.headersSent) {
        res.status(statusCode).json({ message: err.message ?? 'Generation failed' });
      } else {
        res.write(JSON.stringify({ type: 'error', message: err.message }) + '\n');
        res.end();
      }
    }
  }
);

// GET /:aiKey/generated-documents
router.get(
  "/:aiKey/generated-documents",
  authenticateToken,
  async (req, res) => {
    try {
      const applicant = await resolveApplicantForGeneration(req, res);
      if (!applicant) return;

      const firmId = req.context?.firmId || process.env.DEFAULT_FIRM_ID;
      const docs = await listGeneratedDocuments(applicant.id, firmId);
      res.json(docs);
    } catch (err) {
      res.status(500).json({ message: err.message ?? 'Failed to list generated documents' });
    }
  }
);

// GET /:aiKey/generated-documents/:docId/download
router.get(
  "/:aiKey/generated-documents/:docId/download",
  authenticateToken,
  async (req, res) => {
    try {
      const applicant = await resolveApplicantForGeneration(req, res);
      if (!applicant) return;

      const firmId = req.context?.firmId || process.env.DEFAULT_FIRM_ID;
      const url = await getGeneratedDocumentUrl(req.params.docId, applicant.id, firmId);
      res.redirect(302, url);
    } catch (err) {
      const statusCode = err.statusCode ?? 500;
      res.status(statusCode).json({ message: err.message ?? 'Download failed' });
    }
  }
);

router.get("/:aiKey", ctrl.getApplicantByKey);

module.exports = router;
