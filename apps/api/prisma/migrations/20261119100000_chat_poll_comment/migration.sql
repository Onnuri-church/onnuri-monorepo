-- 채팅 투표 댓글 (SCRUM-247)
CREATE TABLE "ChatPollComment" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatPollComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatPollComment_pollId_createdAt_idx" ON "ChatPollComment"("pollId", "createdAt");

ALTER TABLE "ChatPollComment" ADD CONSTRAINT "ChatPollComment_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ChatPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatPollComment" ADD CONSTRAINT "ChatPollComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
