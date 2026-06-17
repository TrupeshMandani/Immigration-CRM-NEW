import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const applicantKeys = {
  all: ["applicants"],
  list: (params) => ["applicants", "list", params ?? {}],
  registered: () => ["applicants", "registered"],
  pendingContacts: () => ["applicants", "pending-contacts"],
  detail: (id) => ["applicants", "detail", id],
};

export function useApplicants(params) {
  return useQuery({
    queryKey: applicantKeys.list(params),
    queryFn: () => api.applicants.list(params),
  });
}

export function useRegisteredApplicants() {
  return useQuery({
    queryKey: applicantKeys.registered(),
    queryFn: () => api.applicants.registered(),
  });
}

export function usePendingContacts() {
  return useQuery({
    queryKey: applicantKeys.pendingContacts(),
    queryFn: () => api.applicants.pendingContacts(),
  });
}

export function useApplicant(id) {
  return useQuery({
    queryKey: applicantKeys.detail(id),
    queryFn: () => api.applicants.byId(id),
    enabled: Boolean(id),
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
