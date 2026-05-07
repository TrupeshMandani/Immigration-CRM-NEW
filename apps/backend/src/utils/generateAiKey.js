const sanitize = (value) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z]/g, "");

const buildBaseKey = (firstName, lastName) => {
  const cleanFirst = sanitize(firstName) || "student";
  const cleanLast = sanitize(lastName) || "user";

  const now = new Date();
  const dateStamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  return `${cleanLast}_${cleanFirst}_${dateStamp}`;
};

const generateAiKey = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || "student";
  const lastName = parts.slice(1).join(" ") || "user";
  return buildBaseKey(firstName, lastName);
};

module.exports = {
  generateAiKey,
  buildBaseKey,
};
