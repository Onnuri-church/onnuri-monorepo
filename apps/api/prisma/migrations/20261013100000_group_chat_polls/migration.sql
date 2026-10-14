-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "ChatPoll" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "allowAddOptions" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatPoll_messageId_key" ON "ChatPoll"("messageId");

-- CreateIndex
CREATE INDEX "ChatPoll_closedAt_closesAt_idx" ON "ChatPoll"("closedAt", "closesAt");

-- CreateIndex
CREATE INDEX "ChatPollOption_pollId_idx" ON "ChatPollOption"("pollId");

-- CreateIndex
CREATE INDEX "ChatPollVote_pollId_userId_idx" ON "ChatPollVote"("pollId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatPollVote_optionId_userId_key" ON "ChatPollVote"("optionId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_groupId_createdAt_idx" ON "ChatMessage"("groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HobbyGroup"("postId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPoll" ADD CONSTRAINT "ChatPoll_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPoll" ADD CONSTRAINT "ChatPoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPollOption" ADD CONSTRAINT "ChatPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ChatPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPollOption" ADD CONSTRAINT "ChatPollOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPollVote" ADD CONSTRAINT "ChatPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ChatPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPollVote" ADD CONSTRAINT "ChatPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ChatPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPollVote" ADD CONSTRAINT "ChatPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

