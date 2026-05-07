const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const {
  getRecommendations,
  generateRecommendations,
  setRecommendationEnabled
} = require("./recommendation.controller");

// Auth needed for all
router.use(authenticateToken);

router.get("/:studentId", getRecommendations);                 // student/admin
router.post("/generate/:studentId", generateRecommendations);
router.patch("/enable/:studentId", requireAdmin, setRecommendationEnabled);  // legacy

module.exports = router;
