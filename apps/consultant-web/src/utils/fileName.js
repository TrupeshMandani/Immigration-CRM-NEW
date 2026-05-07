export const getDisplayFileName = (value = "", fallback = "Document") => {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const segments = trimmed.split(/[/\\]/).filter(Boolean);
  const lastSegment = segments.length ? segments[segments.length - 1] : trimmed;

  return lastSegment || fallback;
};

export const withDisplayName = (file = {}, fallback = "Document") => {
  const rawName =
    (typeof file?.name === "string" && file.name) ||
    (typeof file?.originalName === "string" && file.originalName) ||
    fallback;

  const displayName = getDisplayFileName(rawName, fallback);
  const displayOriginal = getDisplayFileName(
    file?.originalName || rawName,
    fallback
  );

  return {
    ...file,
    rawName,
    name: displayName,
    originalName: displayOriginal,
  };
};

export const mapFilesWithDisplayName = (files = []) => {
  if (!Array.isArray(files)) return [];
  return files.map((file, index) => withDisplayName(file, `Document ${index + 1}`));
};

const sanitizeSegment = (value, fallback) => {
  const fallbackValue = fallback || "Document";
  if (!value || typeof value !== "string") return fallbackValue;
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned || fallbackValue;
};

export const buildRequiredDocFileName = ({
  fieldName = "Document",
  studentName = "Student",
  extension = "",
  index = null,
}) => {
  const fieldSegment = sanitizeSegment(fieldName, "Document");
  const studentSegment = sanitizeSegment(studentName, "Student");
  const uniqueSuffix =
    typeof index === "number" && index >= 0 ? `_${index + 1}` : "";
  return `${fieldSegment}_${studentSegment}${uniqueSuffix}${extension}`;
};

export const renameFileForRequiredDoc = (
  file,
  fieldName,
  studentName,
  index = null
) => {
  if (!(file instanceof File)) return file;
  const originalName = file.name || "";
  const extension = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf("."))
    : "";
  const newName = buildRequiredDocFileName({
    fieldName,
    studentName,
    extension,
    index,
  });
  return new File([file], newName, { type: file.type, lastModified: file.lastModified });
};
