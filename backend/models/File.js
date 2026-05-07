const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    aiKey: { type: String, index: true }, // unique student identifier
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      index: true,
    },
    studentName: String,
    ownerType: {
      type: String,
      enum: ["student", "admin", "ai_assistant", "system"],
      default: "student",
    },
    field: String, // e.g., "Passport", "IELTS"
    fieldSlug: { type: String, index: true },
    requiredDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,
    path: String, // Local path (temp)
    s3Key: String,
    bucket: String,
    storageLocation: {
      type: String,
      enum: ["TEMP", "S3", "LOCAL"],
      default: "S3",
    },
    source: {
      type: String,
      enum: ["manual", "admin", "ai", "smart"],
      default: "manual",
    },
    status: { type: String, default: "UPLOADED" }, // later: EXTRACTED, DRIVE_UPLOADED
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', fileSchema);
