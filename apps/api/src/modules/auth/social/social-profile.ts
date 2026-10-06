// 카카오/구글 토큰 검증 결과의 공통 모양. 검증기가 다르더라도 auth 로직은 이것만 본다.
export interface SocialProfile {
  providerUid: string;
  email: string | null;
  name: string | null;
  /** 소셜 프로필 사진 — 가입 시 기본 아바타로 쓴다 (가입 후에는 본인 설정이 우선). */
  avatarUrl: string | null;
}
