import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const deadlineKeys = {
  all:     () => ["deadlines"],
  lists:   () => ["deadlines", "list"],
  list:    (params) => ["deadlines", "list", params ?? {}],
  detail:  (id) => ["deadlines", "detail", id],
  forCase: (caseId) => ["deadlines", "case", caseId],
};

export function useDeadlines(params) {
  return useQuery({
    queryKey: deadlineKeys.list(params),
    queryFn:  () => api.deadlines.list(params),
  });
}

export function useDeadline(id) {
  return useQuery({
    queryKey: deadlineKeys.detail(id),
    queryFn:  () => api.deadlines.byId(id),
    enabled:  Boolean(id),
  });
}

export function useCaseDeadlines(caseId) {
  return useQuery({
    queryKey: deadlineKeys.forCase(caseId),
    queryFn:  () => api.deadlines.forCase(caseId),
    enabled:  Boolean(caseId),
  });
}

export function useCreateDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.deadlines.create(payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: deadlineKeys.lists() });
      if (vars.case_id) qc.invalidateQueries({ queryKey: deadlineKeys.forCase(vars.case_id) });
    },
  });
}

export function useUpdateDeadline(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) => api.deadlines.update(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: deadlineKeys.detail(id) });
      qc.invalidateQueries({ queryKey: deadlineKeys.lists() });
      if (data?.case_id) qc.invalidateQueries({ queryKey: deadlineKeys.forCase(data.case_id) });
    },
  });
}

export function useDeleteDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deadlines.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: deadlineKeys.lists() }),
  });
}

export function useAcknowledgeDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deadlines.acknowledge(id),
    onSuccess: (data) => {
      if (data?.id) qc.invalidateQueries({ queryKey: deadlineKeys.detail(data.id) });
      qc.invalidateQueries({ queryKey: deadlineKeys.lists() });
      if (data?.case_id) qc.invalidateQueries({ queryKey: deadlineKeys.forCase(data.case_id) });
    },
  });
}
