const Student = require("../../models/Student");
const Recommendation = require("../../models/Recommendation");
const { generateUniversityListFromProfile } = require("./aiRecommendation.service");

// GET /api/recommendations/:studentId  (Student/Admin)
exports.getRecommendations = async (req, res) => {
  try {
    const { studentId } = req.params;

    // AuthZ: students can only read theirs; admins can read any.
    const isStudent = req.user?.role === "student";
    if (isStudent && String(req.userId) !== String(studentId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [rec, student] = await Promise.all([
      Recommendation.findOne({ studentId }),
      Student.findById(studentId).select("preferences"),
    ]);

    const preferences = (student && student.preferences) || {};

    if (!rec) {
      return res.status(404).json({ message: "No recommendations yet", preferences });
    }

    const payload = rec.toObject ? rec.toObject() : rec;
    res.json({ ...payload, preferences });
  } catch (err) {
    console.error("getRecommendations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/recommendations/generate/:studentId
exports.generateRecommendations = async (req, res) => {
  try {
    const { studentId } = req.params;

    console.info("🧠 Generating AI recommendations for student:", studentId);

    const isStudent = req.user?.role === "student";
    if (isStudent && String(req.userId) !== String(studentId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!isStudent && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.status === "inactive") {
      return res.status(403).json({ message: "Inactive student" });
    }

    const filters = req.body?.filters || {};

    const mergedPreferences = {
      ...(student.preferences || {}),
      ...filters,
    };

    const languageBandKeys = [
      "listeningScore",
      "readingScore",
      "writingScore",
      "speakingScore",
    ];

    const numericBandValues = languageBandKeys
      .map((key) => Number(mergedPreferences[key]))
      .filter((value) => Number.isFinite(value));

    if (numericBandValues.length === languageBandKeys.length) {
      const averageBand =
        numericBandValues.reduce((acc, value) => acc + value, 0) /
        numericBandValues.length;
      mergedPreferences.overallScore = Math.round(averageBand * 2) / 2;
    }

    let profile = {
      ...(student.profile || {}),
      ...(student.contactInfo || {}),
      ...mergedPreferences,
    };

    if (!profile || Object.keys(profile).length === 0) {
      profile = mergedPreferences;
    }

    const { universities, source } =
      await generateUniversityListFromProfile(profile);
    console.info(
      `✅ Recommendation generation (${source}) returned ${universities.length} universities for student ${studentId}`
    );

    const payload = {
      studentId,
      universities,
      generatedAt: new Date(),
      source,
    };

    const saved = await Recommendation.findOneAndUpdate(
      { studentId },
      payload,
      { new: true, upsert: true }
    );

    await Student.findByIdAndUpdate(studentId, {
      $set: { preferences: mergedPreferences },
    });

    res.json({
      ...(saved.toObject ? saved.toObject() : saved),
      preferences: mergedPreferences,
    });
  } catch (err) {
    console.error("❌ generateRecommendations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/recommendations/enable/:studentId  (Admin) → toggle gate
exports.setRecommendationEnabled = async (req, res) => {
  res.status(410).json({ message: "Legacy endpoint no longer supported." });
};
