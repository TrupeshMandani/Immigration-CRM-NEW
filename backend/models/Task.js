const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["general", "ai-verification"],
      default: "general",
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "verified", "failed", "completed"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    studentAiKey: { type: String, index: true },
    studentName: String,
    documentId: { type: mongoose.Schema.Types.ObjectId },
    documentField: String,
    documentSlug: String,
    fileId: { type: mongoose.Schema.Types.ObjectId },
    fileName: String,
    uploadTimestamp: Date,
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },
    verificationConfidence: Number,
    verificationDetectedType: String,
    verificationReason: String,
    verificationHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "verified", "failed"],
          default: "pending",
        },
        confidence: Number,
        detectedType: String,
        reason: String,
        recordedAt: { type: Date, default: Date.now },
      },
    ],
    isRead: { type: Boolean, default: false, index: true },
    resolvedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    notificationMuted: { type: Boolean, default: false },
    notificationDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ createdAt: -1 });
taskSchema.index({ type: 1, status: 1, isRead: 1 });

module.exports = mongoose.model("Task", taskSchema);
