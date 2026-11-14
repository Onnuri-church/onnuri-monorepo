import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { Alert } from "react-native";

import { i18n } from "../i18n";
import { useAuthStore } from "../store/useAuthStore";
import { queryClient } from "./queryClient";
import { API_BASE_URL, API_TIMEOUT_MS } from "./config";
import { clearTokens } from "./tokenStorage";
import { refreshSession } from "./session";

export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS });

// 프로필 설정 중(onboarding)도 토큰이 있는 상태라 똑같이 붙인다 — PATCH /users/me가 인증을 요구한다.
apiClient.interceptors.request.use((config) => {
  const { session } = useAuthStore.getState();
  if (session.status === "authenticated" || session.status === "onboarding") {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// 토큰이 있는 상태(authenticated/onboarding)에서 401을 받으면 리프레시 후 원 요청을 한 번
// 재시도한다. 리프레시까지 실패하면 알림을 띄우고, 확인을 눌렀을 때만 세션을 지운다 —
// RootNavigator가 session.status로 화면을 분기하므로 clearSession 호출 자체가 로그인 화면
// 전환을 트리거한다. 게스트/비로그인 상태의 401은 세션 문제가 아니므로 그대로 호출한 쪽에 전달한다.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // 이용 정지 (SCRUM-204) — 글쓰기 진입 전에 미리 막지만, 쓰는 도중 정지된 경우를 위해 여기서도 안내한다.
    const body = error.response?.data as { code?: string; message?: string } | undefined;
    if (error.response?.status === 403 && body?.code === "USER_SUSPENDED") {
      Alert.alert(i18n.t("이용이 제한된 계정이에요"), body.message ?? "");
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      return Promise.reject(error);
    }

    const { session } = useAuthStore.getState();
    const hasSession = session.status === "authenticated" || session.status === "onboarding";
    if (error.response?.status !== 401 || !hasSession) {
      return Promise.reject(error);
    }

    const config = error.config as
      | (InternalAxiosRequestConfig & { retriedAfterRefresh?: boolean })
      | undefined;
    if (config && !config.retriedAfterRefresh) {
      config.retriedAfterRefresh = true;
      const tokens = await refreshSession();
      if (tokens) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return apiClient(config);
      }
    }

    await clearTokens();
    Alert.alert(i18n.t("세션이 만료되었습니다"), i18n.t("다시 로그인해주세요."), [
      { text: i18n.t("확인"), onPress: () => useAuthStore.getState().clearSession() },
    ]);
    return Promise.reject(error);
  },
);
