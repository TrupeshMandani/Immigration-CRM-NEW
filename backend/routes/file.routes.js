const express = require("express");
const router = express.Router();
const multer = require("multer");
const os = require("os");

// Configure multer to rely on the OS temp directory so nothing is stored inside the repo
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function (_req, file, cb) {
    // Keep original extension but add timestamp to prevent collisions
    const safeName = file.originalname || "upload";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${safeName}`.replace(/\s+/g, "_"));
  },
});

const upload = multer({ storage });

// POST /api/files/temp-upload
router.post("/temp-upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Return the absolute path so the AI agent can access it
    const absolutePath = req.file.path;
    console.info("[temp-upload] stored incoming file", {
      originalName: req.file.originalname,
      tempPath: absolutePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      file: {
        tempPath: absolutePath,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Temp Upload Error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

module.exports = router;
