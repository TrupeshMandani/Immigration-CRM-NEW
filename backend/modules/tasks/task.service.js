const mongoose = require("mongoose");
const Task = require("../../models/Task");
const { emitTaskCreated, emitTaskUpdated } = require("../../socket");
const { getStudentDisplayName } = require("../../utils/fileName");

const TASK_RETENTION_DAYS = Number(process.env.TASK_RETENTION_DAYS || 60);
const RETENTION_WINDOW_MS = TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const VERIFICATION_STATUSES = ["pending", "verified", "failed"];

const formatTask = (task) => {
  if (!task) return null;
  const plain = task.toObject ? task.toObject() : task;
  return {
    id: plain._id,
    type: plain.type,
    title: plain.title,
    description: plain.description,
    status: plain.status,
    priority: plain.priority,
    studentId: plain.studentId,
    studentName: plain.studentName,
    studentAiKey: plain.studentAiKey,
    documentId: plain.documentId,
    documentField: plain.documentField,
    documentSlug: plain.documentSlug,
    fileId: plain.fileId,
    fileName: plain.fileName,
    uploadTimestamp: plain.uploadTimestamp,
    verificationStatus: plain.verificationStatus,
    verificationConfidence: plain.verificationConfidence,
    verificationDetectedType: plain.verificationDetectedType,
    verificationReason: plain.verificationReason,
    isRead: plain.isRead,
    resolvedAt: plain.resolvedAt,
    notificationMuted: plain.notificationMuted,
    notificationDeleted: plain.notificationDeleted,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    metadata: plain.metadata,
  };
};

const purgeExpiredTasks = async () => {
  if (!TASK_RETENTION_DAYS || !Number.isFinite(TASK_RETENTION_DAYS)) {
    return;
  }
  const cutoff = new Date(Date.now() - RETENTION_WINDOW_MS);
  await Task.deleteMany({ createdAt: { $lt: cutoff } });
};

const ensureVerificationHistoryEntry = (task, verification) => {
  task.verificationHistory = Array.isArray(task.verificationHistory)
    ? task.verificationHistory
    : [];
  task.verificationHistory.push({
    status: verification.status,
    confidence: verification.confidence,
    detectedType: verification.detectedType,
    reason: verification.reason,
    recordedAt: new Date(),
  });
};

const createVerificationTask = async ({ student, document, fileMeta, verification }) => {
  if (!student || !document || !fileMeta || !verification) return null;

  await purgeExpiredTasks();

  const fileId = fileMeta.id || fileMeta._id || (fileMeta.key ? new mongoose.Types.ObjectId() : null);

  const query = {
    type: "ai-verification",
    documentId: document._id,
  };

  if (fileId) {
    query.fileId = fileId;
  }

  const existing = await Task.findOne({
    ...query,
    status: { $in: ["pending", "failed"] },
  });

  if (existing) {
    existing.status = verification.status === "failed" ? "failed" : "pending";
    existing.verificationStatus = verification.status;
    existing.verificationConfidence = verification.confidence;
    existing.verificationDetectedType = verification.detectedType;
    existing.verificationReason = verification.reason;
    ensureVerificationHistoryEntry(existing, verification);
    existing.isRead = false;
    existing.updatedAt = new Date();
    await existing.save();
    emitTaskUpdated(formatTask(existing));
    return existing;
  }

  const task = await Task.create({
    type: "ai-verification",
    title: `${document.name || "Document"} needs manual verification`,
    description:
      verification.reason ||
      `AI could not verify ${document.name || "the document"}.`,
    status: verification.status === "failed" ? "failed" : "pending",
    priority: verification.status === "failed" ? "high" : "medium",
    studentId: student._id,
    studentAiKey: student.aiKey,
    studentName: getStudentDisplayName(student),
    documentId: document._id,
    documentField: document.name,
    documentSlug: document.slug,
    fileId: fileId,
    fileName: fileMeta.name,
    uploadTimestamp: fileMeta.uploadedAt || new Date(),
    verificationStatus: verification.status,
    verificationConfidence: verification.confidence,
    verificationDetectedType: verification.detectedType,
    verificationReason: verification.reason,
    metadata: {
      s3Key: fileMeta.key,
      bucket: fileMeta.bucket,
      mimeType: fileMeta.mimeType,
    },
  });

  ensureVerificationHistoryEntry(task, verification);
  await task.save();
  emitTaskCreated(formatTask(task));
  return task;
};

const resolveVerificationTasks = async ({
  documentId,
  fileId,
  status = "verified",
  resolvedBy,
  reason,
}) => {
  if (!documentId && !fileId) return;
  const query = { type: "ai-verification" };
  if (fileId) {
    query.fileId = fileId;
  } else if (documentId) {
    query.documentId = documentId;
  }
  query.status = { $in: ["pending", "failed"] };

  const tasks = await Task.find(query);
  if (!tasks.length) return;

  for (const task of tasks) {
    const nextStatus = VERIFICATION_STATUSES.includes(status) ? status : "verified";
    task.status = nextStatus;
    task.verificationStatus = nextStatus;
    task.resolvedAt = new Date();
    task.isRead = false;
    if (resolvedBy) {
      task.resolvedBy = resolvedBy;
    }
    ensureVerificationHistoryEntry(task, {
      status: nextStatus,
      confidence: task.verificationConfidence,
      detectedType: task.verificationDetectedType,
      reason:
        reason ||
        (nextStatus === "verified"
          ? "Verification completed automatically."
          : "Verification task closed."),
    });
    await task.save();
    emitTaskUpdated(formatTask(task));
  }
};

const markTasksRead = async (taskIds = []) => {
  if (!Array.isArray(taskIds) || !taskIds.length) return { updated: 0 };
  const validIds = taskIds
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (!validIds.length) return { updated: 0 };
  const result = await Task.updateMany(
    { _id: { $in: validIds } },
    { $set: { isRead: true } }
  );
  return { updated: result.modifiedCount || result.nModified || 0 };
};

module.exports = {
  formatTask,
  purgeExpiredTasks,
  createVerificationTask,
  resolveVerificationTasks,
  markTasksRead,
};
