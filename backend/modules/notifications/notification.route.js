const express = require("express");
const router = express.Router();
const ctrl = require("./notification.controller");
const { authenticateToken } = require("../../middleware/auth");

router.use(authenticateToken);

router.get("/", ctrl.listNotifications);
router.post("/:id/read", ctrl.markNotificationRead);
router.post("/read-all", ctrl.markAllNotificationsRead);

module.exports = router;
