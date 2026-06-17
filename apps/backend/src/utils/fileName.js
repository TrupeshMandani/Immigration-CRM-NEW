const path = require("path");

const sanitizeSegment = (value, fallback = "Document") => {
  if (!value || typeof value !== "string") return fallback;
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned || fallback;
};

const guessExtension = (originalName, mimetype) => {
  const existing = path.extname(originalName || "").toLowerCase();
  if (existing) return existing;
  const map = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "text/plain": ".txt",
  };
  return map[mimetype?.toLowerCase?.()] || "";
};

const buildRequiredDocFileName = ({
  fieldName = "Document",
  applicantName = "Applicant",
  extension = "",
  index = null,
}) => {
  const fieldSegment = sanitizeSegment(fieldName, "Document");
  const applicantSegment = sanitizeSegment(applicantName, "Applicant");
  const suffix =
    typeof index === "number" && index >= 0 ? `_${index + 1}` : "";
  const safeExtension = extension || "";
  return `${fieldSegment}_${applicantSegment}${suffix}${safeExtension}`;
};

const getApplicantDisplayName = (applicant = {}) => {
  if (!applicant) return "Applicant";
  // Postgres shape
  if (applicant.first_name) {
    return [applicant.first_name, applicant.last_name].filter(Boolean).join(" ");
  }
  const profileData = applicant.profile_data || {};
  if (profileData.fullName) return profileData.fullName;
  if (profileData.name) return profileData.name;
  // Legacy Mongoose shape fallback
  const profile = applicant.profile || {};
  const contact =
    applicant.contactInfo?.name ||
    applicant.contactInfo?.fullName ||
    applicant.contactInfo?.applicantName ||
    "";
  const firstLast = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join("");
  return (
    contact ||
    profile.fullName ||
    profile.name ||
    firstLast ||
    applicant.fullName ||
    applicant.name ||
    applicant.email ||
    "Applicant"
  );
};

module.exports = {
  buildRequiredDocFileName,
  guessExtension,
  getApplicantDisplayName,
};
