-- 알림 설정 1단계: 공지·주보·단톡방·댓글·팔로워 노트 푸시 토글 (기본 켜짐)
ALTER TABLE "User"
  ADD COLUMN "notifyNotice" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyBulletin" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyChat" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyComment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyFollowerNote" BOOLEAN NOT NULL DEFAULT true;
