const Student = require("../../models/Student");

const normalizePassportKey = (key = "") =>
  key.toString().toLowerCase().replace(/[^a-z0-9]/g, "");

const PASSPORT_FIELD_KEYS = {
  fullName: [
    "passportfullname",
    "passportholdername",
    "passportname",
    "fullname",
    "name",
    "givennames",
    "holdername",
  ],
  number: [
    "passportnumber",
    "passportno",
    "passport",
    "documentnumber",
    "traveldocumentnumber",
  ],
  dateOfBirth: ["passportdateofbirth", "dateofbirth", "dob", "birthdate"],
  expiryDate: [
    "passportexpirydate",
    "passportexpiry",
    "expirydate",
    "expirationdate",
    "validuntil",
  ],
};

const normalizePassportDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const match = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const normalized = new Date(match[1]);
      if (!Number.isNaN(normalized.getTime())) {
        return normalized.toISOString().slice(0, 10);
      }
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
        if (value !== undefined && value !== null && value !== "") {
          return value;
        }
      }
    }
    return undefined;
  };

  const result = {
    fullName: passportDetails.fullName || getValue(PASSPORT_FIELD_KEYS.fullName),
    number:
      passportDetails.number ||
      passportDetails.passportNumber ||
      getValue(PASSPORT_FIELD_KEYS.number),
    dateOfBirth:
      passportDetails.dateOfBirth ||
      normalizePassportDate(getValue(PASSPORT_FIELD_KEYS.dateOfBirth)),
    expiryDate:
      passportDetails.expiryDate ||
      normalizePassportDate(getValue(PASSPORT_FIELD_KEYS.expiryDate)),
  };

  if (result.dateOfBirth === undefined) result.dateOfBirth = "";
  if (result.expiryDate === undefined) result.expiryDate = "";

  const hasValues = Object.values(result).some(
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (!hasValues) {
    return {};
  }

  let source = passportDetails.source || (passportDetails.manuallyUpdated ? "manual" : "");
  if (!source) {
    source = "ai";
  }
  result.source = source;
  if (passportDetails.updatedAt) {
    result.updatedAt = passportDetails.updatedAt;
  }

  return result;
};

const mergePassportDetails = (existingProfile = {}, incomingProfile = {}) => {
  const existing = { ...(existingProfile.passportDetails || {}) };

  if (incomingProfile.passportDetails && typeof incomingProfile.passportDetails === "object") {
    const manual = {
      ...existing,
      ...incomingProfile.passportDetails,
    };
    if (manual.fullName) manual.fullName = manual.fullName.trim();
    if (manual.number) manual.number = manual.number.trim();
    if (manual.dateOfBirth)
      manual.dateOfBirth = normalizePassportDate(manual.dateOfBirth);
    if (manual.expiryDate)
      manual.expiryDate = normalizePassportDate(manual.expiryDate);
    manual.source = "manual";
    manual.manuallyUpdated = true;
    manual.updatedAt = new Date();
    return manual;
  }

  const manualLocked = existing.source === "manual" || existing.manuallyUpdated;
  if (manualLocked) {
    return existing;
  }

  const extracted = extractPassportData(incomingProfile);
  const hasExtractedValues = Object.values(extracted).some(
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (!hasExtractedValues) {
    return existing;
  }

  const merged = { ...existing };
  if (!merged.fullName && extracted.fullName) merged.fullName = extracted.fullName;
  if (!merged.number && extracted.number) merged.number = extracted.number;
  if (!merged.dateOfBirth && extracted.dateOfBirth)
    merged.dateOfBirth = normalizePassportDate(extracted.dateOfBirth);
  if (!merged.expiryDate && extracted.expiryDate)
    merged.expiryDate = normalizePassportDate(extracted.expiryDate);

  merged.source = merged.source || extracted.source || "ai";
  merged.updatedAt = new Date();

  return merged;
};

/**
 * Upsert student by aiKey, merging profile/documents if provided.
 * data = { aiKey: string, profile?: object, documents?: object[] }
 */
async function upsertStudent(data) {
  console.log("🔍 upsertStudent called with:", data);

  const { aiKey, profile, documents } = data;

  if (typeof aiKey !== "string") {
    throw new Error("aiKey must be a string");
  }

  if (profile && typeof profile !== "object") {
    throw new Error("profile must be an object");
  }

  if (documents && !Array.isArray(documents)) {
    throw new Error("documents must be an array");
  }

  const existing = await Student.findOne({ aiKey });

  const update = { aiKey };

  if (profile && Object.keys(profile).length) {
    const existingProfile = existing?.profile || {};
    const mergedProfile = { ...existingProfile, ...profile };

    const passportDetails = mergePassportDetails(existingProfile, profile);
    if (passportDetails && Object.keys(passportDetails).length) {
      mergedProfile.passportDetails = passportDetails;
    }

    update.profile = mergedProfile;

    console.log(`🔄 Profile merge for ${aiKey}:`);
    console.log(`   - Existing fields: ${Object.keys(existingProfile).length}`);
    console.log(`   - New fields: ${Object.keys(profile).length}`);
    console.log(
      `   - Total fields after merge: ${Object.keys(mergedProfile).length}`
    );
  }

  if (documents && documents.length) {
    const normalizedDocs = documents.map((doc) => ({
      key: doc.key,
      bucket: doc.bucket,
      name: doc.name,
      mimeType: doc.mimeType,
      size: doc.size,
      uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
    }));

    const currentDocs = existing?.documents || [];
    const mergedMap = new Map();

    currentDocs.forEach((doc) => {
      const key = doc.key || doc.name;
      mergedMap.set(key, doc);
    });

    normalizedDocs.forEach((doc) => {
      const key = doc.key || doc.name;
      mergedMap.set(key, { ...mergedMap.get(key), ...doc });
    });

    update.documents = Array.from(mergedMap.values());
  }

  const student = await Student.findOneAndUpdate(
    { aiKey },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return student;
}

module.exports = { upsertStudent };
