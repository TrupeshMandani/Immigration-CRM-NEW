const express = require("express");
const router = express.Router();

router.use("/upload", require("../modules/upload/upload.routes"));

router.get("/", (req, res) => res.json({ message: "API root ready" }));

// Auth routes
router.use("/auth", require("../modules/auth/auth.route"));

// Contact routes
router.use("/contact", require("../modules/contact/contact.route"));

// Student routes
router.use("/students", require("../modules/students/student.route"));

// Task routes
router.use("/tasks", require("../modules/tasks/task.routes"));

// Notifications routes
router.use("/notifications", require("../modules/notifications/notification.route"));

// Recommendation routes
router.use("/recommendations", require("../AI/ai-recommendation/recommendation.route"));

// AI Assistant routes
router.use("/ai", require("./ai.routes"));

// File routes
router.use("/files", require("./file.routes"));

module.exports = router;
