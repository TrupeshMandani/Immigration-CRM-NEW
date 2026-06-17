const { db } = require('../../db/postgres');
const { applicants } = require('../../db/schema');
const { eq } = require('drizzle-orm');
const { generateUniversityListFromProfile } = require('../../modules/ai/recommendation.service');

// GET /api/recommendations/:applicantId
exports.getRecommendations = async (req, res) => {
  try {
    const applicantId = req.params.applicantId;

    const isApplicant = req.user?.role === 'applicant';
    if (isApplicant && req.userId !== applicantId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const [applicant] = await db.select().from(applicants).where(eq(applicants.id, applicantId)).limit(1);
    if (!applicant) return res.status(404).json({ message: 'Applicant not found' });

    const stateData = applicant.state_data ?? {};
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

// POST /api/recommendations/generate/:applicantId
exports.generateRecommendations = async (req, res) => {
  try {
    const applicantId = req.params.applicantId;

    const isApplicant = req.user?.role === 'applicant';
    if (isApplicant && req.userId !== applicantId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!isApplicant && !['admin', 'senior', 'junior'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const [applicant] = await db.select().from(applicants).where(eq(applicants.id, applicantId)).limit(1);
    if (!applicant) return res.status(404).json({ message: 'Applicant not found' });
    if (applicant.status === 'closed') return res.status(403).json({ message: 'Inactive applicant' });

    const stateData = applicant.state_data ?? {};
    const existingPreferences = stateData.preferences ?? {};
    const filters = req.body?.filters ?? {};
    const mergedPreferences = { ...existingPreferences, ...filters };

    const languageBandKeys = ['listeningScore', 'readingScore', 'writingScore', 'speakingScore'];
    const bandValues = languageBandKeys.map((k) => Number(mergedPreferences[k])).filter(Number.isFinite);
    if (bandValues.length === 4) {
      mergedPreferences.overallScore = Math.round((bandValues.reduce((a, b) => a + b, 0) / 4) * 2) / 2;
    }

    const profile = { ...(applicant.profile_data ?? {}), ...mergedPreferences };

    const context = {
      firmId: req.context?.firmId ?? applicant.firm_id,
      relatedEntityType: 'applicant',
      relatedEntityId: applicantId,
    };
    const { universities, source } = await generateUniversityListFromProfile(profile, context);

    const recPayload = { applicantId, universities, generatedAt: new Date().toISOString(), source };
    const newStateData = { ...stateData, recommendations: recPayload, preferences: mergedPreferences };
    await db.update(applicants).set({ state_data: newStateData }).where(eq(applicants.id, applicantId));

    res.json({ ...recPayload, preferences: mergedPreferences });
  } catch (err) {
    console.error('generateRecommendations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/recommendations/enable/:applicantId — legacy no-op
exports.setRecommendationEnabled = async (req, res) => {
  res.status(410).json({ message: 'Legacy endpoint no longer supported.' });
};
