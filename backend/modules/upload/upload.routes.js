const express = require("express");
const router = express.Router();
const { upload } = require("./upload.service");
const { handleUpload } = require("./upload.controller");
const { authenticateToken, requireStudent } = require("../../middleware/auth");

// POST /api/upload - Protected route for students only
router.post(
  "/",
  authenticateToken,
  requireStudent,
  upload.array("files", 20),
  handleUpload
);

module.exports = router;
