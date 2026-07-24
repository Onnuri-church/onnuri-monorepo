import axios from "axios";
import { Alert } from "react-native";

import { useAuthStore } from "../store/useAuthStore";

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 세션 만료 등으로 401을 받으면 알림을 띄우고, 확인을 눌렀을 때만 세션을 지운다.
// RootNavigator가 accessToken 유무로 화면을 분기하므로, clearSession 호출 자체가 로그인 화면 전환을 트리거한다.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Alert.alert("세션이 만료되었습니다", "다시 로그인해주세요.", [
        { text: "확인", onPress: () => useAuthStore.getState().clearSession() },
      ]);
    }
    return Promise.reject(error);
  },
);
