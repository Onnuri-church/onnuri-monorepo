import axios from "axios";

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
