import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationSettings, UpdateNotificationSettingsRequest } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

const SETTINGS_KEY = ["notification-settings"];

// 알림 토글 3종 (GET /users/me/notification-settings).
export function useNotificationSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () =>
      apiClient
        .get<NotificationSettings>("/users/me/notification-settings")
        .then((res) => res.data),
  });
}

// 토글 저장 — 낙관적으로 먼저 바꾸고, 실패하면 서버 값으로 되돌린다
// (토글이 눌렀다 튕겨 돌아가는 게 저장 실패의 피드백이다).
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateNotificationSettingsRequest) =>
      apiClient
        .patch<NotificationSettings>("/users/me/notification-settings", body)
        .then((res) => res.data),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = queryClient.getQueryData<NotificationSettings>(SETTINGS_KEY);
      if (previous) queryClient.setQueryData(SETTINGS_KEY, { ...previous, ...body });
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS_KEY, context.previous);
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
    },
  });
}
