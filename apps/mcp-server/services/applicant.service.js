const FormData = require("form-data");
const fs = require("fs");
const httpClient = require("../utils/httpClient");

const APPLICANTS_BASE_PATH = "/applicants";

const ensureValue = (value, name) => {
  if (!value) {
    throw new Error(`${name} is required`);
  }
};

const formatError = (error, fallbackMessage) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallbackMessage;
  return new Error(message);
};

const buildApplicantPath = (applicantId, suffix = "") => {
  const encodedId = encodeURIComponent(applicantId);
  return `${APPLICANTS_BASE_PATH}/${encodedId}${suffix}`;
};

const getApplicantById = async (applicantId) => {
  ensureValue(applicantId, "applicantId");
  try {
    const res = await httpClient.get(buildApplicantPath(applicantId));
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to fetch applicant.");
  }
};

const searchApplicants = async (query = "") => {
  try {
    const params = {};
    if (typeof query === "string" && query.trim().length > 0) {
      params.search = query.trim();
    }
    const res = await httpClient.get(APPLICANTS_BASE_PATH, { params });
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to search applicants.");
  }
};

const getMissingDocuments = async (applicantId) => {
  ensureValue(applicantId, "applicantId");
  try {
    const res = await httpClient.get(buildApplicantPath(applicantId, "/missing-documents"));
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to fetch missing documents.");
  }
};

const getApplicantTasks = async (applicantId) => {
  ensureValue(applicantId, "applicantId");
  try {
    const res = await httpClient.get(buildApplicantPath(applicantId, "/tasks"));
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to fetch applicant tasks.");
  }
};

const createApplicantTask = async (applicantId, payload = {}) => {
  ensureValue(applicantId, "applicantId");
  ensureValue(payload.title, "title");

  try {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.description) {
      formData.append("description", payload.description);
    }
    if (payload.dueDate) {
      formData.append("dueDate", payload.dueDate);
    }
    if (payload.attachmentPath) {
      if (!fs.existsSync(payload.attachmentPath)) {
        throw new Error(`Attachment not found at ${payload.attachmentPath}`);
      }
      formData.append("attachment", fs.createReadStream(payload.attachmentPath));
    }

    const res = await httpClient.post(buildApplicantPath(applicantId, "/tasks"), formData, {
      headers: formData.getHeaders(),
    });
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to create applicant task.");
  }
};

const updateApplicantTask = async (applicantId, taskId, updates = {}) => {
  ensureValue(applicantId, "applicantId");
  ensureValue(taskId, "taskId");
  if (!updates || typeof updates !== "object" || !Object.keys(updates).length) {
    throw new Error("updates payload is required");
  }

  try {
    const res = await httpClient.patch(
      buildApplicantPath(applicantId, `/tasks/${encodeURIComponent(taskId)}`),
      updates
    );
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to update applicant task.");
  }
};

const deleteApplicantTask = async (applicantId, taskId) => {
  ensureValue(applicantId, "applicantId");
  ensureValue(taskId, "taskId");
  try {
    const res = await httpClient.delete(
      buildApplicantPath(applicantId, `/tasks/${encodeURIComponent(taskId)}`)
    );
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to delete applicant task.");
  }
};

const updateApplicantStage = async (applicantId, newStage) => {
  ensureValue(applicantId, "applicantId");
  ensureValue(newStage, "newStage");
  try {
    const res = await httpClient.patch(buildApplicantPath(applicantId, "/stage"), { newStage });
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to update applicant stage.");
  }
};

const addNote = async (applicantId, noteText) => {
  ensureValue(applicantId, "applicantId");
  ensureValue(noteText, "noteText");
  try {
    const res = await httpClient.post(buildApplicantPath(applicantId, "/notes"), { noteText });
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to add note.");
  }
};

const getApplicantOverview = async (applicantId) => {
  ensureValue(applicantId, "applicantId");
  try {
    const res = await httpClient.get(buildApplicantPath(applicantId, "/overview"));
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to fetch applicant overview.");
  }
};

module.exports = {
  getApplicantById,
  searchApplicants,
  getMissingDocuments,
  getApplicantTasks,
  createApplicantTask,
  updateApplicantTask,
  deleteApplicantTask,
  updateApplicantStage,
  addNote,
  getApplicantOverview,
};
