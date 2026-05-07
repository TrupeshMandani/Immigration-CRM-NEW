import api from "./api";

const notificationService = {
  list: async ({ status = "UNREAD", page = 1, limit = 20 } = {}) => {
    const res = await api.get("/notifications", {
      params: { status, page, limit },
    });
    return res.data;
  },
  markRead: async (id) => {
    const res = await api.post(`/notifications/${id}/read`);
    return res.data.notification;
  },
  markAllRead: async () => {
    await api.post("/notifications/read-all");
  },
};

export default notificationService;
