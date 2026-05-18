const FormData = require("form-data");
const fs = require("fs");
const httpClient = require("../utils/httpClient");

const STUDENTS_BASE_PATH = "/students";

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

const buildStudentPath = (studentId, suffix = "") => {
  const encodedId = encodeURIComponent(studentId);
  return `${STUDENTS_BASE_PATH}/${encodedId}${suffix}`;
};

const getStudentById = async (studentId) => {
  ensureValue(studentId, "studentId");
  try {
    const res = await httpClient.get(buildStudentPath(studentId));
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to fetch student.");
  }
};

const searchStudents = async (query = "") => {
  try {
    const params = {};
    if (typeof query === "string" && query.trim().length > 0) {
      params.search = query.trim();
    }
    const res = await httpClient.get(STUDENTS_BASE_PATH, { params });
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to search students.");
  }
};

const getMissingDocuments = async (studentId) => {
  ensureValue(studentId, "studentId");
  try {
    const res = await httpClient.get(buildStudentPath(studentId, "/missing-documents"));
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to fetch missing documents.");
  }
};

const getStudentTasks = async (studentId) => {
  ensureValue(studentId, "studentId");
  try {
    const res = await httpClient.get(buildStudentPath(studentId, "/tasks"));
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to fetch student tasks.");
  }
};

const createStudentTask = async (studentId, payload = {}) => {
  ensureValue(studentId, "studentId");
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

    const res = await httpClient.post(buildStudentPath(studentId, "/tasks"), formData, {
      headers: formData.getHeaders(),
    });
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to create student task.");
  }
};

const updateStudentTask = async (studentId, taskId, updates = {}) => {
  ensureValue(studentId, "studentId");
  ensureValue(taskId, "taskId");
  if (!updates || typeof updates !== "object" || !Object.keys(updates).length) {
    throw new Error("updates payload is required");
  }

  try {
    const res = await httpClient.patch(
      buildStudentPath(studentId, `/tasks/${encodeURIComponent(taskId)}`),
      updates
    );
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to update student task.");
  }
};

const deleteStudentTask = async (studentId, taskId) => {
  ensureValue(studentId, "studentId");
  ensureValue(taskId, "taskId");
  try {
    const res = await httpClient.delete(
      buildStudentPath(studentId, `/tasks/${encodeURIComponent(taskId)}`)
    );
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to delete student task.");
  }
};

const updateStudentStage = async (studentId, newStage) => {
  ensureValue(studentId, "studentId");
  ensureValue(newStage, "newStage");
  try {
    const res = await httpClient.patch(buildStudentPath(studentId, "/stage"), { newStage });
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to update student stage.");
  }
};

const addNote = async (studentId, noteText) => {
  ensureValue(studentId, "studentId");
  ensureValue(noteText, "noteText");
  try {
    const res = await httpClient.post(buildStudentPath(studentId, "/notes"), { noteText });
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to add note.");
  }
};

const getStudentOverview = async (studentId) => {
  ensureValue(studentId, "studentId");
  try {
    const res = await httpClient.get(buildStudentPath(studentId, "/overview"));
    return res.data;
  } catch (error) {
    throw formatError(error, "Failed to fetch student overview.");
  }
};

module.exports = {
  getStudentById,
  searchStudents,
  getMissingDocuments,
  getStudentTasks,
  createStudentTask,
  updateStudentTask,
  deleteStudentTask,
  updateStudentStage,
  addNote,
  getStudentOverview,
};
