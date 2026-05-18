const { extractProfileWithAI } = require('../ai/extract.service');
const { uploadFileToS3, deleteLocalFile } = require('../s3/s3.service');
const { upsertStudent } = require('../students/student.service');
const { prioritizeFields } = require('../../AI/ai-file-extract/field-priority');
const { db } = require('../../db/postgres');
const { students, documents } = require('../../db/schema');
const { eq } = require('drizzle-orm');

exports.handleUpload = async (req, res) => {
  try {
    const files = req.files;

    if (!req.user || !req.user.ai_key) {
      return res.status(400).json({ message: 'User authentication required' });
    }

    const aiKey = req.user.ai_key;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const aiContext = { firmId: student.firm_id, relatedEntityType: 'student', relatedEntityId: student.id };
    const profile = await extractProfileWithAI(files, aiContext);

    const uploaded = [];
    const docInserts = [];

    for (const file of files) {
      try {
        const s3Result = await uploadFileToS3(file.path, file.originalname, aiKey);
        uploaded.push(file.originalname);
        docInserts.push({
          firm_id: student.firm_id,
          student_id: student.id,
          s3_key: s3Result.key,
          s3_bucket: s3Result.bucket,
          mime_type: file.mimetype,
          size_bytes: file.size,
          document_type: null,
          ai_verification: { name: file.originalname },
        });
        deleteLocalFile(file.path);
      } catch (uploadError) {
        console.error(`Error uploading ${file.originalname}:`, uploadError.message);
      }
    }

    if (docInserts.length) {
      await db.insert(documents).values(docInserts);
    }

    const safeProfile = profile || {};
    const updatedStudent = await upsertStudent({ aiKey, profile: safeProfile });

    res.json({
      message: `Successfully processed ${uploaded.length} files`,
      aiKey,
      uploaded,
      student: {
        id: updatedStudent.id,
        aiKey: updatedStudent.ai_key,
        profile: prioritizeFields(updatedStudent.profile_data || {}),
      },
      extractedFields: Object.keys(safeProfile).length,
      profile: prioritizeFields(safeProfile),
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};
