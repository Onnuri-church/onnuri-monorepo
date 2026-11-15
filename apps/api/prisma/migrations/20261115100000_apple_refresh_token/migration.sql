-- 회원탈퇴 시 Apple 로그인 토큰 철회 (SCRUM-205) — 로그인 때 받은 리프레시 토큰과 발급 대상 번들 ID
ALTER TABLE "SocialAccount" ADD COLUMN "appleRefreshToken" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "appleClientId" TEXT;
