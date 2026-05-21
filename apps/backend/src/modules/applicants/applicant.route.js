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

const uploadDir = path.join(__dirname, "../../tmp/required-docs");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// Admin convenience routes
router.get(
  "/registered",
  authenticateToken,
  requireAdmin,
  ctrl.getRegisteredStudents
);

// Public routes (for students to access their own data)
router.put(
  "/me/profile",
  authenticateToken,
  requireApplicant,
  ctrl.updateSelfProfile
);
router.get("/:aiKey/files", authenticateToken, ctrl.getStudentFiles);
router.post(
  "/:aiKey/documents/:documentId/rename",
  authenticateToken,
  ctrl.renameStudentDocument
);
router.delete(
  "/:aiKey/documents/:documentId",
  authenticateToken,
  ctrl.deleteStudentDocument
);

// Admin-only routes
router.post("/", authenticateToken, requireAdmin, ctrl.createApplicant);
router.get("/", authenticateToken, requireAdmin, ctrl.getAllStudents);
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
  ctrl.activateStudent
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
router.get("/:aiKey/tasks", authenticateToken, ctrl.listStudentTasks);
router.post(
  "/:aiKey/tasks",
  authenticateToken,
  requireAdmin,
  upload.single("attachment"),
  ctrl.createStudentTask
);
router.patch(
  "/:aiKey/tasks/:taskId",
  authenticateToken,
  ctrl.updateStudentTask
);
router.get(
  "/:aiKey/tasks/:taskId/attachment",
  authenticateToken,
  ctrl.getStudentTaskAttachmentUrl
);
router.delete(
  "/:aiKey/tasks/:taskId",
  authenticateToken,
  ctrl.deleteStudentTask
);
router.get("/:aiKey", ctrl.getStudentByKey);

module.exports = router;
