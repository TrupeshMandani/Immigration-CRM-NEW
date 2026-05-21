import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const studentKeys = {
  all: ["students"],
  list: (params) => ["students", "list", params ?? {}],
  registered: () => ["students", "registered"],
  pendingContacts: () => ["students", "pending-contacts"],
  detail: (id) => ["students", "detail", id],
};

export function useApplicants(params) {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => api.students.list(params),
  });
}

export function useRegisteredApplicants() {
  return useQuery({
    queryKey: studentKeys.registered(),
    queryFn: () => api.students.registered(),
  });
}

export function usePendingContacts() {
  return useQuery({
    queryKey: studentKeys.pendingContacts(),
    queryFn: () => api.students.pendingContacts(),
  });
}

export function useStudent(id) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () => api.students.byId(id),
    enabled: Boolean(id),
  });
}

export function useCreateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.students.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useUpdateStudent(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates) => api.students.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
}

export function useActivateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.students.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.students.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useApproveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.students.approveContact(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: studentKeys.pendingContacts() }),
  });
}
