-- 이전 구조(팀당 단톡방 1개)의 메시지는 새 구조(방 단위)로 옮길 수 없어 지운다 — 시범 테스트 데이터뿐이다.
DELETE FROM "ChatMessage" WHERE "teamId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_teamId_fkey";

-- DropIndex
DROP INDEX "ChatMessage_teamId_createdAt_idx";

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "teamId",
ADD COLUMN     "roomId" TEXT;

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatRoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamBoardPost" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "files" JSONB NOT NULL DEFAULT '[]',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamBoardPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamBoardComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamBoardComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamBoardReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamBoardReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatRoom_teamId_idx" ON "ChatRoom"("teamId");

-- CreateIndex
CREATE INDEX "ChatRoomMember_userId_idx" ON "ChatRoomMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoomMember_roomId_userId_key" ON "ChatRoomMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "TeamBoardPost_teamId_createdAt_idx" ON "TeamBoardPost"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamBoardComment_postId_createdAt_idx" ON "TeamBoardComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamBoardReaction_postId_idx" ON "TeamBoardReaction"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamBoardReaction_postId_userId_emoji_key" ON "TeamBoardReaction"("postId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoomMember" ADD CONSTRAINT "ChatRoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoomMember" ADD CONSTRAINT "ChatRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBoardPost" ADD CONSTRAINT "TeamBoardPost_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBoardPost" ADD CONSTRAINT "TeamBoardPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBoardComment" ADD CONSTRAINT "TeamBoardComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TeamBoardPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBoardComment" ADD CONSTRAINT "TeamBoardComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBoardComment" ADD CONSTRAINT "TeamBoardComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TeamBoardComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBoardReaction" ADD CONSTRAINT "TeamBoardReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TeamBoardPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBoardReaction" ADD CONSTRAINT "TeamBoardReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

