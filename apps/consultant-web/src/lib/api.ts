const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new ApiError(401, "Unauthorized");
  }

  let data: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message =
      (data as any)?.message ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

// ─── Student types ────────────────────────────────────────────────────────────

export interface Student {
  _id: string;
  id?: string;
  username?: string;
  email?: string;
  status: "pending" | "registered" | "active" | "inactive" | "closed";
  aiKey?: string;
  isFirstLogin?: boolean;
  profileComplete?: boolean;
  recommendationEnabled?: boolean;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  };
  profile?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStudentPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export interface ContactRequest extends Student {
  inviteSent?: boolean;
}

// ─── Task types ───────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  type?: string;
  status?: string;
  verificationStatus?: string;
  verificationReason?: string;
  verificationDetectedType?: string;
  verificationConfidence?: number;
  documentId?: string;
  documentField?: string;
  studentId?: string;
  studentName?: string;
  studentAiKey?: string;
  uploadTimestamp?: string;
  createdAt?: string;
}

export interface TasksResponse {
  tasks: Task[];
  meta?: { total: number; page: number; pages: number };
}

// ─── Notification types ───────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  status: "UNREAD" | "READ";
  actorName?: string;
  taskId?: string;
  taskTitle?: string;
  taskSummary?: string;
  createdAt?: string;
  readAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  meta?: { total: number; page: number; pages: number };
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; user: Student }>("POST", "/auth/login", { username, password }),
    firebaseLogin: (idToken: string) =>
      request<{ token: string; user: Student }>("POST", "/auth/firebase-login", { idToken }),
    requestLoginLink: (email: string) =>
      request<{ message: string }>("POST", "/auth/login-link", { email }),
    register: (payload: { name: string; email: string; phone?: string }) =>
      request<unknown>("POST", "/auth/register", payload),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<unknown>("POST", "/auth/change-password", { currentPassword, newPassword }),
  },

  // Students (admin)
  students: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return request<Student[]>("GET", `/students${qs}`);
    },
    registered: () => request<Student[]>("GET", "/students/registered"),
    pendingContacts: () => request<Student[]>("GET", "/students/pending/contacts"),
    byId: (id: string) => request<Student>("GET", `/students/admin/${id}`),
    create: (payload: CreateStudentPayload) =>
      request<{ student: Student }>("POST", "/students", payload),
    update: (id: string, updates: Partial<Student> & { contactInfo?: Student["contactInfo"] }) =>
      request<Student>("PUT", `/students/${id}`, updates),
    activate: (id: string) => request<Student>("POST", `/students/${id}/activate`),
    delete: (id: string) => request<void>("DELETE", `/students/${id}`),
    approveContact: (id: string) =>
      request<{ student: Student; inviteSent: boolean }>("POST", `/students/${id}/approve-contact`),
    files: (aiKey: string) =>
      request<{ files: unknown[] }>("GET", `/students/${aiKey}/files`),
  },

  // Tasks (admin)
  tasks: {
    list: (params?: Record<string, string | number>) => {
      const qs = params
        ? `?${new URLSearchParams(
            Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
          ).toString()}`
        : "";
      return request<TasksResponse>("GET", `/tasks${qs}`);
    },
    delete: (id: string) => request<void>("DELETE", `/tasks/${id}`),
  },

  // Notifications
  notifications: {
    list: (params?: { status?: string; page?: number }) => {
      const qs = params
        ? `?${new URLSearchParams(
            Object.fromEntries(
              Object.entries(params)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
            )
          ).toString()}`
        : "";
      return request<NotificationsResponse>("GET", `/notifications${qs}`);
    },
    markRead: (id: string) =>
      request<Notification>("PATCH", `/notifications/${id}/read`),
    markAllRead: () => request<void>("POST", "/notifications/read-all"),
  },

  // Contact
  contact: {
    submit: (payload: { name: string; email: string; phone?: string; message?: string }) =>
      request<unknown>("POST", "/contact", payload),
  },
};

export { ApiError };
