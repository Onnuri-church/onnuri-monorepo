/** GET /app/version 응답 — 앱 강제 업데이트 정책 (SCRUM-193) */
export interface AppVersionPolicy {
  /** 이 버전("1.2.3")보다 낮은 앱은 업데이트 안내만 본다. null이면 강제하지 않는다 */
  minVersion: string | null;
  /** 업데이트 버튼이 열 스토어 주소 (아직 출시 전이면 null) */
  storeUrl: { android: string | null; ios: string | null };
}
