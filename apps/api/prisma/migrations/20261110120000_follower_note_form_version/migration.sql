-- 팔로워 노트 양식 버전 (SCRUM-179). 기존 노트는 v1(예전 문항), 새 노트는 v2(목사님 양식).
ALTER TABLE "FollowerNote" ADD COLUMN "formVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "FollowerNote" ALTER COLUMN "formVersion" SET DEFAULT 2;
