const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    aiKey: { type: String, unique: true, index: true }, // internal invisible ID
    profile: { type: mongoose.Schema.Types.Mixed }, // any JSON structure
    // Remove drive field - no longer needed for S3
    // Authentication fields
    username: {
      type: String,
      unique: true,
      sparse: true, // allows null values
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      default: "student",
      enum: ["student"],
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "registered", "active", "inactive"],
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    contactInfo: {
      name: String,
      email: String,
      phone: String,
      message: String,
    },
    requiredDocuments: [
      {
        name: { type: String, required: true },
        description: { type: String },
        slug: { type: String, required: true },
        aiExtractionEnabled: { type: Boolean, default: true },
        files: [
          {
            key: { type: String, required: true },
            bucket: { type: String },
            name: { type: String, required: true },
            size: Number,
            mimeType: String,
            uploadedAt: { type: Date, default: Date.now },
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
            uploadedByRole: { type: String, default: "student" },
            verification: {
              status: {
                type: String,
                enum: ["pending", "verified", "failed"],
                default: "pending",
              },
              confidence: Number,
              detectedType: String,
              reason: String,
              checkedAt: { type: Date, default: Date.now },
            },
            verificationTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
          },
        ],
        isUploaded: { type: Boolean, default: false },
        verification: {
          status: {
            type: String,
            enum: ["pending", "verified", "failed"],
            default: "pending",
          },
          confidence: Number,
          detectedType: String,
          reason: String,
          lastCheckedAt: { type: Date },
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    documents: [
      {
        key: String, // S3 key (e.g., "student123/passport.pdf")
        bucket: String, // S3 bucket name
        name: String, // Original filename
        mimeType: String, // File mime type
        size: Number, // File size in bytes
        uploadedAt: Date, // Upload timestamp
      },
    ],
    tasks: [
      {
        title: { type: String, required: true },
        description: { type: String },
        dueDate: { type: Date },
        status: {
          type: String,
          enum: ["pending", "completed"],
          default: "pending",
        },
        attachment: {
          key: String,
          bucket: String,
          name: String,
          mimeType: String,
          size: Number,
        },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        assignedAt: { type: Date, default: Date.now },
        completedAt: { type: Date },
        seenByStudent: { type: Boolean, default: false },
      },
    ],
    profileComplete: { type: Boolean, default: false },
    recommendationEnabled: { type: Boolean, default: true },
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Remove sensitive fields from JSON output
studentSchema.methods.toJSON = function () {
  const student = this.toObject();
  return student;
};

module.exports = mongoose.model("Student", studentSchema);
