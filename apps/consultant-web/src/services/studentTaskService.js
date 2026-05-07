import api from "./api";

const studentTaskService = {
  list: async (aiKey, params = {}) => {
    const res = await api.get(`/students/${aiKey}/tasks`, { params });
    return res.data.tasks || [];
  },
  create: async (aiKey, payload = {}) => {
    const formData = new FormData();
    formData.append("title", payload.title || "");
    if (payload.description) {
      formData.append("description", payload.description);
    }
    if (payload.dueDate) {
      formData.append("dueDate", payload.dueDate);
    }
    if (payload.attachment) {
      formData.append("attachment", payload.attachment);
    }
    const res = await api.post(`/students/${aiKey}/tasks`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.tasks || [];
  },
  update: async (aiKey, taskId, payload = {}) => {
    const res = await api.patch(`/students/${aiKey}/tasks/${taskId}`, payload);
    return res.data.tasks || [];
  },
  attachmentUrl: async (aiKey, taskId) => {
    const res = await api.get(`/students/${aiKey}/tasks/${taskId}/attachment`);
    return res.data.url;
  },
  delete: async (aiKey, taskId) => {
    const res = await api.delete(`/students/${aiKey}/tasks/${taskId}`);
    return res.data.tasks || [];
  },
};

export default studentTaskService;
