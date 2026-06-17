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

  // Register applicant
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

export const applicantService = {
  // Get all applicants (admin only)
  getAllApplicants: async (params = {}) => {
    const response = await api.get("/applicants", { params });
    return response.data;
  },

  // Create applicant (admin only)
  createApplicant: async (payload) => {
    const response = await api.post("/applicants", payload);
    return response.data;
  },

  // Get pending contacts (admin only)
  getPendingContacts: async () => {
    const response = await api.get("/applicants/pending/contacts");
    return response.data;
  },

  // Get applicant by ID (admin only)
  getApplicantById: async (id) => {
    const response = await api.get(`/applicants/admin/${id}`);
    return response.data;
  },

  // Approve contact request and trigger onboarding (admin only)
  approveContactRequest: async (id) => {
    const response = await api.post(`/applicants/${id}/approve-contact`);
    return response.data;
  },

  // Activate applicant (admin only)
  activateApplicant: async (id) => {
    const response = await api.post(`/applicants/${id}/activate`);
    return response.data;
  },

  // Update applicant (admin only)
  updateApplicant: async (id, updates) => {
    const response = await api.put(`/applicants/${id}`, updates);
    return response.data;
  },

  // Delete applicant (admin only)
  deleteApplicant: async (id) => {
    const response = await api.delete(`/applicants/${id}`);
    return response.data;
  },

  // Get applicant by aiKey (public)
  getApplicantByKey: async (aiKey) => {
    const response = await api.get(`/applicants/${aiKey}`);
    return response.data;
  },

  getRegisteredApplicants: async (params = {}) => {
    const response = await api.get("/applicants/registered", { params });
    return response.data;
  },

  // Get applicant files (public)
  getApplicantFiles: async (aiKey) => {
    const response = await api.get(`/applicants/${aiKey}/files`);
    return response.data;
  },

  updateSelfProfile: async (payload) => {
    const response = await api.put("/applicants/me/profile", payload);
    return response.data;
  },
};

