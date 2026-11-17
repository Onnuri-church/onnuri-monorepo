-- 단톡방 입장·퇴장 안내 메시지 (SCRUM-217)
ALTER TABLE "ChatMessage" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
