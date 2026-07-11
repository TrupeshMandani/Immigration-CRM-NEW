const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function setToken(token: string): void {
  localStorage.setItem("token", token);
}

function forceLogout(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
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

// Single in-flight refresh promise shared across concurrent requests
let refreshPromise: Promise<string> | null = null;

async function tryRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  }).then(async (res) => {
    if (!res.ok) throw new ApiError(res.status, "Refresh failed");
    const body = await res.json();
    setToken(body.token);
    return body.token as string;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const doFetch = (token: string | null) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    };
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    });
  };

  let res = await doFetch(getToken());

  if (res.status === 401) {
    try {
      const newToken = await tryRefresh();
      res = await doFetch(newToken);
    } catch {
      forceLogout();
      throw new ApiError(401, "Unauthorized");
    }
  }

  if (res.status === 401) {
    forceLogout();
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

// ─── Applicant types ──────────────────────────────────────────────────────────

export interface Applicant {
  id: string;
  _id?: string;
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

export interface CreateApplicantPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export interface ContactRequest extends Applicant {
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
  applicantId?: string;
  applicantName?: string;
  applicantAiKey?: string;
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

// ─── Case types ───────────────────────────────────────────────────────────────

export type CaseType =
  | "express_entry" | "pnp" | "family_sponsorship" | "work_permit" | "lmia"
  | "study_permit" | "pgwp" | "visitor_visa" | "citizenship" | "refugee_asylum" | "hc";

export type CaseStatus = "open" | "in_progress" | "submitted" | "approved" | "rejected" | "closed";

export interface CaseRecord {
  id: string;
  firm_id: string;
  applicant_id: string;
  assigned_to?: string | null;
  case_type: CaseType;
  status: CaseStatus;
  title: string;
  matter_number?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCasePayload {
  applicant_id: string;
  case_type: CaseType;
  title: string;
  status?: CaseStatus;
  description?: string;
  assigned_to?: string | null;
  metadata?: Record<string, unknown>;
}

export type UpdateCasePayload = Partial<Omit<CreateCasePayload, "applicant_id">>;

export interface CaseEvent {
  id: string;
  firm_id: string;
  case_id: string;
  actor_id?: string | null;
  event_type: string;
  label: string;
  old_value?: unknown;
  new_value?: unknown;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

// ─── Deadline types ───────────────────────────────────────────────────────────

export type DeadlineType =
  | "work_permit_expiry" | "study_permit_expiry" | "visitor_visa_expiry"
  | "pr_card_expiry" | "passport_expiry" | "rfe_response" | "filing_deadline"
  | "biometrics_appointment" | "medical_exam" | "interview_date"
  | "ita_expiry" | "copr_expiry" | "bridging_permit_expiry" | "lmia_expiry" | "custom";

export type DeadlineUrgency = "overdue" | "critical" | "warning" | "upcoming" | "future";

export interface DeadlineRecord {
  id: string;
  firm_id: string;
  case_id: string;
  applicant_id: string;
  assigned_to?: string | null;
  deadline_type: DeadlineType;
  label: string;
  due_date: string;
  description?: string | null;
  auto_calculated: boolean;
  days_before_notification: number[];
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  urgency: DeadlineUrgency;
  days_until: number;
}

export interface CreateDeadlinePayload {
  case_id: string;
  applicant_id: string;
  deadline_type: DeadlineType;
  label?: string;
  due_date: string;
  description?: string;
  assigned_to?: string | null;
  days_before_notification?: number[];
  metadata?: Record<string, unknown>;
}

export type UpdateDeadlinePayload = Partial<Omit<CreateDeadlinePayload, "case_id" | "applicant_id">>;

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; user: Applicant }>("POST", "/auth/login", { username, password }),
    firebaseLogin: (idToken: string) =>
      request<{ token: string; user: Applicant }>("POST", "/auth/firebase-login", { idToken }),
    requestLoginLink: (email: string) =>
      request<{ message: string }>("POST", "/auth/login-link", { email }),
    register: (payload: { name: string; email: string; phone?: string }) =>
      request<unknown>("POST", "/auth/register", payload),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<unknown>("POST", "/auth/change-password", { currentPassword, newPassword }),
  },

  // Applicants (admin)
  applicants: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
      return request<Applicant[]>("GET", `/applicants${qs}`);
    },
    registered: () => request<Applicant[]>("GET", "/applicants/registered"),
    pendingContacts: () => request<Applicant[]>("GET", "/applicants/pending/contacts"),
    byId: (id: string) => request<Applicant>("GET", `/applicants/admin/${id}`),
    create: (payload: CreateApplicantPayload) =>
      request<{ applicant: Applicant }>("POST", "/applicants", payload),
    update: (id: string, updates: Partial<Applicant> & { contactInfo?: Applicant["contactInfo"] }) =>
      request<Applicant>("PUT", `/applicants/${id}`, updates),
    activate: (id: string) => request<Applicant>("POST", `/applicants/${id}/activate`),
    delete: (id: string) => request<void>("DELETE", `/applicants/${id}`),
    approveContact: (id: string) =>
      request<{ applicant: Applicant; inviteSent: boolean }>("POST", `/applicants/${id}/approve-contact`),
    files: (aiKey: string) =>
      request<{ files: unknown[] }>("GET", `/applicants/${aiKey}/files`),
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
      request<Notification>("POST", `/notifications/${id}/read`),
    markAllRead: () => request<void>("POST", "/notifications/read-all"),
  },

  // Contact
  contact: {
    submit: (payload: { name: string; email: string; phone?: string; message?: string }) =>
      request<unknown>("POST", "/contact", payload),
  },

  // Deadlines / Calendar
  deadlines: {
    list: (params?: Record<string, unknown>) => {
      const qs = params
        ? `?${new URLSearchParams(
            Object.fromEntries(
              Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== "")
                .map(([k, v]) => [k, String(v)])
            )
          ).toString()}`
        : "";
      return request<DeadlineRecord[]>("GET", `/deadlines${qs}`);
    },
    byId:        (id: string) => request<DeadlineRecord>("GET", `/deadlines/${id}`),
    create:      (payload: CreateDeadlinePayload) => request<DeadlineRecord>("POST", "/deadlines", payload),
    update:      (id: string, patch: UpdateDeadlinePayload) => request<DeadlineRecord>("PATCH", `/deadlines/${id}`, patch),
    delete:      (id: string) => request<void>("DELETE", `/deadlines/${id}`),
    acknowledge: (id: string) => request<DeadlineRecord>("POST", `/deadlines/${id}/acknowledge`),
    forCase:     (caseId: string) => request<DeadlineRecord[]>("GET", `/cases/${caseId}/deadlines`),
  },

  // Cases / Matter management
  cases: {
    list: (params?: Record<string, string | number>) => {
      const qs = params
        ? `?${new URLSearchParams(
            Object.fromEntries(
              Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== "")
                .map(([k, v]) => [k, String(v)])
            )
          ).toString()}`
        : "";
      return request<CaseRecord[]>("GET", `/cases${qs}`);
    },
    byId: (id: string) => request<CaseRecord>("GET", `/cases/${id}`),
    create: (payload: CreateCasePayload) => request<CaseRecord>("POST", "/cases", payload),
    update: (id: string, patch: UpdateCasePayload) => request<CaseRecord>("PATCH", `/cases/${id}`, patch),
    delete: (id: string) => request<void>("DELETE", `/cases/${id}`),
    events: (id: string) => request<CaseEvent[]>("GET", `/cases/${id}/events`),
  },
};

export { ApiError };
