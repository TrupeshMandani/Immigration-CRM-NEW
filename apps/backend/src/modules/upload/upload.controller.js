const fs = require("fs");
const path = require("path");
const { extractProfileWithAI } = require("../../AI/ai-file-extract/extract.service");
const { uploadFileToS3, deleteLocalFile } = require("../s3/s3.service");
const { upsertStudent } = require("../students/student.service");
const { prioritizeFields } = require("../../AI/ai-file-extract/field-priority");
const Student = require("../../models/Student");

exports.handleUpload = async (req, res) => {
  try {
    console.log("🔍 Upload Debug - req.user:", req.user);
    console.log("🔍 Upload Debug - req.userRole:", req.userRole);

    const files = req.files;

    if (!req.user || !req.user.aiKey) {
      return res.status(400).json({ message: "User authentication required" });
    }

    const aiKey = req.user.aiKey; // From authenticated session

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    console.log(`🤖 Starting AI extraction for ${files.length} files...`);

    // Extract profile data from all files
    const profile = await extractProfileWithAI(files);

    // Get student to get username for S3 folder
    const student = await Student.findOne({ aiKey });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const storageKey = student.aiKey || student.username;
    const uploaded = [];
    const documents = [];

    // Upload files to S3
    for (const file of files) {
      try {
        console.log(`📤 Uploading to S3: ${file.originalname}`);

        const s3Result = await uploadFileToS3(
          file.path,
          file.originalname,
          storageKey
        );

        console.log(`✅ S3 upload result:`, s3Result);

        uploaded.push(file.originalname);
        const documentMetadata = {
          key: s3Result.key,
          bucket: s3Result.bucket,
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        };
        documents.push(documentMetadata);

        console.log(`📄 Document metadata:`, documentMetadata);
        console.log(`📄 S3 Result key:`, s3Result.key);
        console.log(`📄 S3 Result bucket:`, s3Result.bucket);

        // Delete local file after successful upload
        deleteLocalFile(file.path);
      } catch (uploadError) {
        console.error(
          `❌ Error uploading ${file.originalname}:`,
          uploadError.message
        );
        // Continue with other files
      }
    }

    console.log(`✅ All files uploaded to S3`);
    console.log(`🔍 Debug - aiKey:`, aiKey, typeof aiKey);
    console.log(`🔍 Debug - profile:`, profile, typeof profile);
    console.log(`🔍 Debug - documents:`, documents, Array.isArray(documents));

    // Ensure profile is an object
    const safeProfile = profile || {};
    const safeDocuments = documents || [];

    console.log(`🔍 Debug - safeProfile:`, safeProfile);
    console.log(`🔍 Debug - safeDocuments:`, safeDocuments);

    // Update student profile with cumulative data
    const updatedStudent = await upsertStudent({
      aiKey,
      profile: safeProfile,
      documents: safeDocuments,
    });

    res.json({
      message: `Successfully processed ${uploaded.length} files`,
      aiKey,
      uploaded,
      student: {
        ...updatedStudent.toObject(),
        profile: prioritizeFields(updatedStudent.profile || {}),
      },
      extractedFields: Object.keys(safeProfile).length,
      profile: prioritizeFields(safeProfile),
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
};
