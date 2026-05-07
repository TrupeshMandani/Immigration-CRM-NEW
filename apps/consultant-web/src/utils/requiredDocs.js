import { mapFilesWithDisplayName } from "./fileName";

const statusFallback = (value) => {
  if (value === "verified" || value === "failed" || value === "pending") {
    return value;
  }
  return "pending";
};

const buildVerificationMeta = (
  input = {},
  { fallbackStatus = "pending", isUploaded = false } = {}
) => {
  const normalizedStatus = statusFallback(
    input.status || fallbackStatus || (isUploaded ? "pending" : "pending")
  );

  return {
    status: normalizedStatus,
    reason:
      input.reason ||
      (isUploaded
        ? normalizedStatus === "verified"
          ? "AI verified this upload"
          : "Awaiting verification"
        : "Document not uploaded yet"),
    confidence:
      typeof input.confidence === "number" ? input.confidence : null,
    detectedType: input.detectedType || "",
    lastCheckedAt: input.lastCheckedAt || input.checkedAt || null,
  };
};

export const normalizeFileList = (files = []) =>
  mapFilesWithDisplayName(files || []).map((file) => ({
    ...file,
    verification: buildVerificationMeta(file.verification || {}, {
      fallbackStatus: file.verification?.status || "pending",
      isUploaded: true,
    }),
  }));

export const normalizeRequiredDoc = (doc) => {
  if (!doc) return doc;
  const files = normalizeFileList(doc.files || []);
  const verification = buildVerificationMeta(doc.verification || {}, {
    fallbackStatus: doc.verification?.status || doc.verificationStatus || "pending",
    isUploaded: doc.isUploaded || files.length > 0,
  });
  return {
    ...doc,
    files,
    verification,
    verificationStatus: verification.status,
  };
};

export const normalizeRequiredDocs = (docs = []) =>
  Array.isArray(docs) ? docs.map((doc) => normalizeRequiredDoc(doc)) : [];
