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

// Preferred routes — :applicantId
router.get("/:applicantId", getRecommendations);                            // applicant/admin
router.post("/generate/:applicantId", generateRecommendations);
router.patch("/enable/:applicantId", requireAdmin, setRecommendationEnabled); // legacy

module.exports = router;
