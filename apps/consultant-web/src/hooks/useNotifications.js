import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const notifKeys = {
  all: ["notifications"],
  list: (params) => ["notifications", "list", params ?? {}],
};

export function useNotificationsList(params) {
  return useQuery({
    queryKey: notifKeys.list(params),
    queryFn: () => api.notifications.list(params),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
  });
}
