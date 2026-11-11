-- 리프레시 토큰 묶음(로그인 세션) + 사용 시각 — 재사용 감지 시 세션 전체 무효화 (SCRUM-166)
-- 기존 토큰은 지금까지 "쓰면 지우는" 방식이라 남은 행은 모두 아직 안 쓴 토큰이다. 각자를 한 묶음으로 둔다.
ALTER TABLE "RefreshToken" ADD COLUMN "familyId" TEXT;
UPDATE "RefreshToken" SET "familyId" = "id";
ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "RefreshToken" ADD COLUMN "usedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
