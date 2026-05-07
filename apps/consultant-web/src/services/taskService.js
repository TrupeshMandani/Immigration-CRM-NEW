import api from "./api";

export const taskService = {
  list: async (params = {}) => {
    const response = await api.get("/tasks", { params });
    return response.data;
  },
  update: async (taskId, payload) => {
    const response = await api.patch(`/tasks/${taskId}`, payload);
    return response.data.task;
  },
  delete: async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
  },
  markNotificationsRead: async (taskIds = []) => {
    const response = await api.post("/tasks/notifications/read", { taskIds });
    return response.data;
  },
};

export default taskService;
