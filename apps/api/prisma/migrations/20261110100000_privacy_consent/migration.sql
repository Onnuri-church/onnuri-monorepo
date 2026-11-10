-- 개인정보 수집·이용 동의(필수, 처리방침 버전 기록)와 민감정보(신앙 관련 글) 처리 동의(선택) — SCRUM-175
ALTER TABLE "User"
  ADD COLUMN "privacyConsentAt" TIMESTAMP(3),
  ADD COLUMN "privacyConsentVersion" TEXT,
  ADD COLUMN "sensitiveConsentAt" TIMESTAMP(3);
