import api from "./api"; // your axios instance

export const requiredDocsService = {
  get: async (aiKey) => {
    const res = await api.get(`/applicants/${aiKey}/required-documents`);
    return res.data.requiredDocuments;
  },
  add: async (aiKey, payload) => {
    const res = await api.post(`/applicants/${aiKey}/required-documents`, payload);
    return res.data.requiredDocuments;
  },
  delete: async (aiKey, docId) => {
    const res = await api.delete(`/applicants/${aiKey}/required-documents/${docId}`);
    return res.data.requiredDocuments;
  },
  updateSettings: async (aiKey, docId, payload) => {
    const res = await api.patch(
      `/applicants/${aiKey}/required-documents/${docId}`,
      payload
    );
    return res.data.document;
  },
  upload: async (aiKey, docId, file, options = {}) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post(
      `/applicants/${aiKey}/required-documents/${docId}/files`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: options.onUploadProgress,
      }
    );
    return res.data.document;
  },
  listFiles: async (aiKey, docId) => {
    const res = await api.get(`/applicants/${aiKey}/required-documents/${docId}/files`);
    return res.data.files || [];
  },
  fileUrl: async (aiKey, docId, fileId) => {
    const res = await api.get(
      `/applicants/${aiKey}/required-documents/${docId}/files/${fileId}/url`
    );
    return res.data.url;
  },
  deleteFile: async (aiKey, docId, fileId) => {
    const res = await api.delete(
      `/applicants/${aiKey}/required-documents/${docId}/files/${fileId}`
    );
    return res.data.document;
  },
  verifyFile: async (aiKey, docId, fileId) => {
    const res = await api.post(
      `/applicants/${aiKey}/required-documents/${docId}/files/${fileId}/verify`
    );
    return res.data.document;
  },
};
