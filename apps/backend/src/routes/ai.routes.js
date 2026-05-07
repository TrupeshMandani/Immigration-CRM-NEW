const express = require("express");
const router = express.Router();
const { handleAssistantQuery } = require("../AI/assistant");
const Student = require("../models/Student");

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  try {
    const { message, studentId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const authHeader = req.headers.authorization;
    console.info("[ai-chat] inbound request", {
      studentId: studentId || null,
      hasAuth: Boolean(authHeader),
      messagePreview: message.slice(0, 120),
      timestamp: new Date().toISOString(),
    });
    
    // Set headers for streaming
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await handleAssistantQuery(message, studentId, authHeader, res);
    console.info("[ai-chat] streaming completed", {
      studentId: studentId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Chat Route Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// GET /api/ai/documents/url - Get presigned URL for a document
router.get("/documents/url", async (req, res) => {
  try {
    const { fileName, aiKey } = req.query;
    const { getPresignedUrl } = require("../helpers/s3");

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    // If aiKey provided, search that student's documents
    if (aiKey) {
      const student = await Student.findOne({ aiKey });
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Search in student's documents
      const document = student.documents?.find(doc => 
        doc.name === fileName || 
        doc.key?.includes(fileName) ||
        doc.key?.endsWith(fileName)
      );

      if (document) {
        const url = await getPresignedUrl(document.key, document.name);
        return res.json({ url, document });
      }
    }

    // If no aiKey or not found, search all students for this file
    const students = await Student.find({ 
      "documents.name": { $regex: fileName, $options: 'i' }
    });

    for (const student of students) {
      const document = student.documents?.find(doc => 
        doc.name === fileName || 
        doc.key?.includes(fileName) ||
        doc.key?.endsWith(fileName)
      );

      if (document) {
        const url = await getPresignedUrl(document.key, document.name);
        return res.json({ url, document, aiKey: student.aiKey });
      }
    }

    return res.status(404).json({ error: "Document not found" });
  } catch (error) {
    console.error("Document URL Error:", error);
    res.status(500).json({ error: "Failed to fetch document URL" });
  }
});

module.exports = router;

