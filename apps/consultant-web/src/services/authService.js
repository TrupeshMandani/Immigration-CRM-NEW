import api from "./api";

export const authService = {
  // Login
  login: async (username, password) => {
    const response = await api.post("/auth/login", { username, password });
    return response.data;
  },

  firebaseLogin: async (idToken) => {
    const response = await api.post("/auth/firebase-login", { idToken });
    return response.data;
  },

  requestLoginLink: async (email) => {
    const response = await api.post("/auth/login-link", { email });
    return response.data;
  },

  // Register student
  register: async ({ name, email, phone }) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      phone,
    });
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  // Register admin (one-time setup)
  registerAdmin: async (username, email, password) => {
    const response = await api.post("/auth/register-admin", {
      username,
      email,
      password,
    });
    return response.data;
  },
};

export const contactService = {
  // Submit contact form
  submitContact: async (contactData) => {
    const response = await api.post("/contact", contactData);
    return response.data;
  },
};

export const studentService = {
  // Get all students (admin only)
  getAllStudents: async (params = {}) => {
    const response = await api.get("/students", { params });
    return response.data;
  },

  // Create student (admin only)
  createStudent: async (payload) => {
    const response = await api.post("/students", payload);
    return response.data;
  },

  // Get pending contacts (admin only)
  getPendingContacts: async () => {
    const response = await api.get("/students/pending/contacts");
    return response.data;
  },

  // Get student by ID (admin only)
  getStudentById: async (id) => {
    const response = await api.get(`/students/admin/${id}`);
    return response.data;
  },

  // Approve contact request and trigger onboarding (admin only)
  approveContactRequest: async (id) => {
    const response = await api.post(`/students/${id}/approve-contact`);
    return response.data;
  },

  // Activate student (admin only)
  activateStudent: async (id) => {
    const response = await api.post(`/students/${id}/activate`);
    return response.data;
  },

  // Update student (admin only)
  updateStudent: async (id, updates) => {
    const response = await api.put(`/students/${id}`, updates);
    return response.data;
  },

  // Delete student (admin only)
  deleteStudent: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  // Get student by aiKey (public)
  getStudentByKey: async (aiKey) => {
    const response = await api.get(`/students/${aiKey}`);
    return response.data;
  },

  getRegisteredStudents: async (params = {}) => {
    const response = await api.get("/students/registered", { params });
    return response.data;
  },

  // Get student files (public)
  getStudentFiles: async (aiKey) => {
    const response = await api.get(`/students/${aiKey}/files`);
    return response.data;
  },

  updateSelfProfile: async (payload) => {
    const response = await api.put("/students/me/profile", payload);
    return response.data;
  },
};
