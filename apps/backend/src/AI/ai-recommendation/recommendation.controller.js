const { db } = require('../../db/postgres');
const { applicants } = require('../../db/schema');
const { eq } = require('drizzle-orm');
const { generateUniversityListFromProfile } = require('../../modules/ai/recommendation.service');

// GET /api/recommendations/:studentId
exports.getRecommendations = async (req, res) => {
  try {
    const { studentId } = req.params;

    const isStudent = req.user?.role === 'applicant';
    if (isStudent && req.userId !== studentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const [student] = await db.select().from(applicants).where(eq(applicants.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ message: 'Applicant not found' });

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

    const isStudent = req.user?.role === 'applicant';
    if (isStudent && req.userId !== studentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!isStudent && !['admin', 'senior', 'junior'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const [student] = await db.select().from(applicants).where(eq(applicants.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ message: 'Applicant not found' });
    if (student.status === 'closed') return res.status(403).json({ message: 'Inactive applicant' });

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

    const context = {
      firmId: req.context?.firmId ?? student.firm_id,
      relatedEntityType: 'applicant',
      relatedEntityId: studentId,
    };
    const { universities, source } = await generateUniversityListFromProfile(profile, context);

    const recPayload = { studentId, universities, generatedAt: new Date().toISOString(), source };
    const newStateData = { ...stateData, recommendations: recPayload, preferences: mergedPreferences };
    await db.update(applicants).set({ state_data: newStateData }).where(eq(applicants.id, studentId));

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
