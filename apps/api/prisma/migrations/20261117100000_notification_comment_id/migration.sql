-- 댓글 알림을 누르면 그 댓글을 짚어 보여준다 (SCRUM-215)
ALTER TABLE "Notification" ADD COLUMN "commentId" TEXT;
