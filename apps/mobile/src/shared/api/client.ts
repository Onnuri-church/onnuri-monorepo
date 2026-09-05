import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { Alert } from "react-native";

import { useAuthStore } from "../store/useAuthStore";
import { API_BASE_URL } from "./config";
import { clearTokens } from "./tokenStorage";
import { refreshSession } from "./session";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const { session } = useAuthStore.getState();
  if (session.status === "authenticated") {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// 로그인 상태에서 401을 받으면 리프레시 후 원 요청을 한 번 재시도한다. 리프레시까지 실패하면
// 알림을 띄우고, 확인을 눌렀을 때만 세션을 지운다 — RootNavigator가 session.status로 화면을
// 분기하므로 clearSession 호출 자체가 로그인 화면 전환을 트리거한다.
// 게스트/비로그인 상태의 401은 세션 문제가 아니므로 그대로 호출한 쪽에 전달한다.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { session } = useAuthStore.getState();
    if (error.response?.status !== 401 || session.status !== "authenticated") {
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
    Alert.alert("세션이 만료되었습니다", "다시 로그인해주세요.", [
      { text: "확인", onPress: () => useAuthStore.getState().clearSession() },
    ]);
    return Promise.reject(error);
  },
);
