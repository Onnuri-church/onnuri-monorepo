// Expo Go 실기기에서 localhost는 폰 자신을 가리킨다 — 실기기로 백엔드에 붙으려면
// 개발 머신의 LAN IP를 EXPO_PUBLIC_API_URL로 넘긴다 (예: http://192.168.0.10:3000).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
