const { db } = require('../../db/postgres');
const { applicants } = require('../../db/schema');
const { eq } = require('drizzle-orm');

// ─── Pure passport-field helpers (unchanged) ─────────────────────────────────

const normalizePassportKey = (key = '') =>
  key.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

const PASSPORT_FIELD_KEYS = {
  fullName: ['passportfullname', 'passportholdername', 'passportname', 'fullname', 'name', 'givennames', 'holdername'],
  number: ['passportnumber', 'passportno', 'passport', 'documentnumber', 'traveldocumentnumber'],
  dateOfBirth: ['passportdateofbirth', 'dateofbirth', 'dob', 'birthdate'],
  expiryDate: ['passportexpirydate', 'passportexpiry', 'expirydate', 'expirationdate', 'validuntil'],
};

const normalizePassportDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const match = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const normalized = new Date(match[1]);
      if (!Number.isNaN(normalized.getTime())) return normalized.toISOString().slice(0, 10);
    }
  }
  return value;
};

const mapKeysToLower = (obj = {}) =>
  Object.entries(obj).reduce((acc, [key, value]) => {
    acc[normalizePassportKey(key)] = value;
    return acc;
  }, {});

const extractPassportData = (profile = {}) => {
  const passportDetails = profile?.passportDetails || {};
  const sources = [mapKeysToLower(profile), mapKeysToLower(passportDetails)];

  const getValue = (keys) => {
    const normalizedKeys = keys.map(normalizePassportKey);
    for (const source of sources) {
      for (const key of normalizedKeys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== '') return value;
      }
    }
    return undefined;
  };

  const result = {
    fullName: passportDetails.fullName || getValue(PASSPORT_FIELD_KEYS.fullName),
    number: passportDetails.number || passportDetails.passportNumber || getValue(PASSPORT_FIELD_KEYS.number),
    dateOfBirth: passportDetails.dateOfBirth || normalizePassportDate(getValue(PASSPORT_FIELD_KEYS.dateOfBirth)),
    expiryDate: passportDetails.expiryDate || normalizePassportDate(getValue(PASSPORT_FIELD_KEYS.expiryDate)),
  };

  if (result.dateOfBirth === undefined) result.dateOfBirth = '';
  if (result.expiryDate === undefined) result.expiryDate = '';

  const hasValues = Object.values(result).some((v) => v !== undefined && v !== null && v !== '');
  if (!hasValues) return {};

  let source = passportDetails.source || (passportDetails.manuallyUpdated ? 'manual' : '');
  if (!source) source = 'ai';
  result.source = source;
  if (passportDetails.updatedAt) result.updatedAt = passportDetails.updatedAt;

  return result;
};

const mergePassportDetails = (existingProfile = {}, incomingProfile = {}) => {
  const existing = { ...(existingProfile.passportDetails || {}) };

  if (incomingProfile.passportDetails && typeof incomingProfile.passportDetails === 'object') {
    const manual = { ...existing, ...incomingProfile.passportDetails };
    if (manual.fullName) manual.fullName = manual.fullName.trim();
    if (manual.number) manual.number = manual.number.trim();
    if (manual.dateOfBirth) manual.dateOfBirth = normalizePassportDate(manual.dateOfBirth);
    if (manual.expiryDate) manual.expiryDate = normalizePassportDate(manual.expiryDate);
    manual.source = 'manual';
    manual.manuallyUpdated = true;
    manual.updatedAt = new Date();
    return manual;
  }

  const manualLocked = existing.source === 'manual' || existing.manuallyUpdated;
  if (manualLocked) return existing;

  const extracted = extractPassportData(incomingProfile);
  const hasExtracted = Object.values(extracted).some((v) => v !== undefined && v !== null && v !== '');
  if (!hasExtracted) return existing;

  const merged = { ...existing };
  if (!merged.fullName && extracted.fullName) merged.fullName = extracted.fullName;
  if (!merged.number && extracted.number) merged.number = extracted.number;
  if (!merged.dateOfBirth && extracted.dateOfBirth) merged.dateOfBirth = normalizePassportDate(extracted.dateOfBirth);
  if (!merged.expiryDate && extracted.expiryDate) merged.expiryDate = normalizePassportDate(extracted.expiryDate);
  merged.source = merged.source || extracted.source || 'ai';
  merged.updatedAt = new Date();
  return merged;
};

// ─── upsertApplicant ─────────────────────────────────────────────────────────────

async function upsertApplicant(data) {
  const { aiKey, profile } = data;

  if (typeof aiKey !== 'string') throw new Error('aiKey must be a string');
  if (profile && typeof profile !== 'object') throw new Error('profile must be an object');

  const [existing] = await db.select().from(applicants).where(eq(applicants.ai_key, aiKey)).limit(1);

  if (!profile || !Object.keys(profile).length) {
    if (!existing) throw new Error(`Applicant with aiKey ${aiKey} not found`);
    return existing;
  }

  if (!existing) throw new Error(`Applicant with aiKey ${aiKey} not found — cannot upsert profile`);

  const existingProfile = existing.profile_data ?? {};
  const mergedProfile = { ...existingProfile, ...profile };

  const passportDetails = mergePassportDetails(existingProfile, profile);
  if (passportDetails && Object.keys(passportDetails).length) {
    mergedProfile.passportDetails = passportDetails;
  }

  const [updated] = await db.update(applicants)
    .set({ profile_data: mergedProfile, updated_at: new Date() })
    .where(eq(applicants.ai_key, aiKey))
    .returning();

  return updated;
}

module.exports = {
  upsertApplicant,
  mergePassportDetails,
  normalizePassportDate,
  extractPassportData,
};
