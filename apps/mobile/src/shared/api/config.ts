// Expo Go 실기기에서 localhost는 폰 자신을 가리킨다 — 실기기로 백엔드에 붙으려면
// 개발 머신의 LAN IP를 EXPO_PUBLIC_API_URL로 넘긴다 (예: http://192.168.0.10:3000).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// 요청 타임아웃. axios 기본값은 0(무제한)이라 서버가 응답하지 않으면 요청이 영원히 대기하고,
// 부팅 중 세션 복원이 걸리면 스플래시에서 앱이 멈춘다. Render 콜드 스타트(30초~1분)까지
// 기다려주지는 못하지만, 그 경우에도 멈추지 않고 로그인 화면으로 넘어가는 쪽을 택했다.
export const API_TIMEOUT_MS = 20_000;
// 사진·동영상·문서 업로드는 느린 회선에서 오래 걸리므로 따로 길게 둔다.
export const UPLOAD_TIMEOUT_MS = 120_000;
