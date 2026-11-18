-- 채팅방 알림 끄기 (SCRUM-230)
ALTER TABLE "ChatReadState" ADD COLUMN "muted" BOOLEAN NOT NULL DEFAULT false;
