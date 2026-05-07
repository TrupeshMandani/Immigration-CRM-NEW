const express = require("express");
const router = express.Router();
const ctrl = require("./task.controller");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

router.use(authenticateToken, requireAdmin);

router.get("/", ctrl.listTasks);
router.post("/notifications/read", ctrl.markNotificationsRead);
router.patch("/:taskId", ctrl.updateTask);
router.delete("/:taskId", ctrl.deleteTask);

module.exports = router;
