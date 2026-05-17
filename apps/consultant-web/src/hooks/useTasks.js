import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const taskKeys = {
  all: ["tasks"],
  list: (params) => ["tasks", "list", params ?? {}],
};

export function useTasks(params) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => api.tasks.list(params),
    select: (data) => data.tasks ?? [],
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.tasks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
