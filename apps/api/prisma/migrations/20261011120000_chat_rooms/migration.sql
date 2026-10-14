-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHAT';

-- DropForeignKey
ALTER TABLE "TeamMessage" DROP CONSTRAINT "TeamMessage_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMessage" DROP CONSTRAINT "TeamMessage_authorId_fkey";

-- DropTable
DROP TABLE "TeamMessage";

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "cellId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "replyToId" TEXT,
    "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "noticeAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_teamId_createdAt_idx" ON "ChatMessage"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_cellId_createdAt_idx" ON "ChatMessage"("cellId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatReaction_messageId_idx" ON "ChatReaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReaction_messageId_userId_emoji_key" ON "ChatReaction"("messageId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

