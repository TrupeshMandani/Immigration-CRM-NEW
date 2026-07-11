import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const applicantKeys = {
  all: ["applicants"],
  list: (params) => ["applicants", "list", params ?? {}],
  registered: () => ["applicants", "registered"],
  pendingContacts: () => ["applicants", "pending-contacts"],
  detail: (id) => ["applicants", "detail", id],
};

// Backend (post-Postgres migration) returns `id` (UUID), not `_id`.
// This normalizer ensures both fields are always set so legacy components
// referencing applicant._id keep working without individual edits.
function normalize(a) {
  if (!a) return a;
  const unified = a._id || a.id;
  return { ...a, _id: unified, id: unified };
}

export function useApplicants(params) {
  return useQuery({
    queryKey: applicantKeys.list(params),
    queryFn: () => api.applicants.list(params),
    select: (data) => data.map(normalize),
  });
}

export function useRegisteredApplicants() {
  return useQuery({
    queryKey: applicantKeys.registered(),
    queryFn: () => api.applicants.registered(),
    select: (data) => data.map(normalize),
  });
}

export function usePendingContacts() {
  return useQuery({
    queryKey: applicantKeys.pendingContacts(),
    queryFn: () => api.applicants.pendingContacts(),
    select: (data) => data.map(normalize),
  });
}

export function useApplicant(id) {
  return useQuery({
    queryKey: applicantKeys.detail(id),
    queryFn: () => api.applicants.byId(id),
    enabled: Boolean(id),
    select: normalize,
  });
}

export function useCreateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.applicants.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicantKeys.all }),
  });
}

export function useUpdateApplicant(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates) => api.applicants.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicantKeys.detail(id) });
      qc.invalidateQueries({ queryKey: applicantKeys.all });
    },
  });
}

export function useActivateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.applicants.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicantKeys.all }),
  });
}

export function useDeleteApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.applicants.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicantKeys.all }),
  });
}

export function useApproveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.applicants.approveContact(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: applicantKeys.pendingContacts() }),
  });
}
