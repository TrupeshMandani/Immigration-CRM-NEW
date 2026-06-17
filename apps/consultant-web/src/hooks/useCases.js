import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const caseKeys = {
  all: ["cases"],
  lists: () => ["cases", "list"],
  list: (params) => ["cases", "list", params ?? {}],
  detail: (id) => ["cases", "detail", id],
  events: (id) => ["cases", "events", id],
};

export function useCases(params) {
  return useQuery({
    queryKey: caseKeys.list(params),
    queryFn: () => api.cases.list(params),
  });
}

export function useCase(id) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: () => api.cases.byId(id),
    enabled: Boolean(id),
  });
}

export function useCaseEvents(id) {
  return useQuery({
    queryKey: caseKeys.events(id),
    queryFn: () => api.cases.events(id),
    enabled: Boolean(id),
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.cases.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: caseKeys.lists() }),
  });
}

export function useUpdateCase(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) => api.cases.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(id) });
      qc.invalidateQueries({ queryKey: caseKeys.lists() });
      qc.invalidateQueries({ queryKey: caseKeys.events(id) });
    },
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.cases.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: caseKeys.lists() }),
  });
}
