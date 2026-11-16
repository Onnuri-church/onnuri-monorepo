// 카카오/구글 토큰 검증 결과의 공통 모양. 검증기가 다르더라도 auth 로직은 이것만 본다.
export interface SocialProfile {
  providerUid: string;
  /**
   * 제공자가 "인증된" 이메일이라고 확인해 준 경우에만 채운다 (SCRUM-208).
   * 이메일은 로그인 수단끼리 같은 사람으로 연결하는 축이라, 인증 안 된 주소를 믿으면
   * 남의 이메일을 적어 둔 계정으로 그 사람 계정에 들어갈 수 있다 — 인증 안 됐으면 null.
   */
  email: string | null;
  name: string | null;
  /** 소셜 프로필 사진 — 가입 시 기본 아바타로 쓴다 (가입 후에는 본인 설정이 우선). */
  avatarUrl: string | null;
}
