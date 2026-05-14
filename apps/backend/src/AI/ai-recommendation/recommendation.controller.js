const { db } = require('../../db/postgres');
const { students } = require('../../db/schema');
const { eq } = require('drizzle-orm');
const { generateUniversityListFromProfile } = require('./aiRecommendation.service');

// GET /api/recommendations/:studentId
exports.getRecommendations = async (req, res) => {
  try {
    const { studentId } = req.params;

    const isStudent = req.user?.role === 'student';
    if (isStudent && req.userId !== studentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const stateData = student.state_data ?? {};
    const preferences = stateData.preferences ?? {};
    const rec = stateData.recommendations ?? null;

    if (!rec) {
      return res.status(404).json({ message: 'No recommendations yet', preferences });
    }

    res.json({ ...rec, preferences });
  } catch (err) {
    console.error('getRecommendations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/recommendations/generate/:studentId
exports.generateRecommendations = async (req, res) => {
  try {
    const { studentId } = req.params;

    const isStudent = req.user?.role === 'student';
    if (isStudent && req.userId !== studentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!isStudent && !['admin', 'senior', 'junior'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.status === 'inactive') return res.status(403).json({ message: 'Inactive student' });

    const stateData = student.state_data ?? {};
    const existingPreferences = stateData.preferences ?? {};
    const filters = req.body?.filters ?? {};
    const mergedPreferences = { ...existingPreferences, ...filters };

    const languageBandKeys = ['listeningScore', 'readingScore', 'writingScore', 'speakingScore'];
    const bandValues = languageBandKeys.map((k) => Number(mergedPreferences[k])).filter(Number.isFinite);
    if (bandValues.length === 4) {
      mergedPreferences.overallScore = Math.round((bandValues.reduce((a, b) => a + b, 0) / 4) * 2) / 2;
    }

    const profile = { ...(student.profile_data ?? {}), ...mergedPreferences };

    const { universities, source } = await generateUniversityListFromProfile(profile);

    const recPayload = { studentId, universities, generatedAt: new Date().toISOString(), source };
    const newStateData = { ...stateData, recommendations: recPayload, preferences: mergedPreferences };
    await db.update(students).set({ state_data: newStateData }).where(eq(students.id, studentId));

    res.json({ ...recPayload, preferences: mergedPreferences });
  } catch (err) {
    console.error('generateRecommendations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/recommendations/enable/:studentId — legacy no-op
exports.setRecommendationEnabled = async (req, res) => {
  res.status(410).json({ message: 'Legacy endpoint no longer supported.' });
};
