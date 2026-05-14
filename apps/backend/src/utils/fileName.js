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
  studentName = "Student",
  extension = "",
  index = null,
}) => {
  const fieldSegment = sanitizeSegment(fieldName, "Document");
  const studentSegment = sanitizeSegment(studentName, "Student");
  const suffix =
    typeof index === "number" && index >= 0 ? `_${index + 1}` : "";
  const safeExtension = extension || "";
  return `${fieldSegment}_${studentSegment}${suffix}${safeExtension}`;
};

const getStudentDisplayName = (student = {}) => {
  if (!student) return "Student";
  // Postgres shape
  if (student.first_name) {
    return [student.first_name, student.last_name].filter(Boolean).join(" ");
  }
  const profileData = student.profile_data || {};
  if (profileData.fullName) return profileData.fullName;
  if (profileData.name) return profileData.name;
  // Legacy Mongoose shape fallback
  const profile = student.profile || {};
  const contact =
    student.contactInfo?.name ||
    student.contactInfo?.fullName ||
    student.contactInfo?.studentName ||
    "";
  const firstLast = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join("");
  return (
    contact ||
    profile.fullName ||
    profile.name ||
    firstLast ||
    student.fullName ||
    student.name ||
    student.email ||
    "Student"
  );
};

module.exports = {
  buildRequiredDocFileName,
  guessExtension,
  getStudentDisplayName,
};
