-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "leaderRoomId" TEXT;

-- CreateTable
CREATE TABLE "LeaderRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderRoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderRoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaderRoomMember_userId_idx" ON "LeaderRoomMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderRoomMember_roomId_userId_key" ON "LeaderRoomMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_leaderRoomId_createdAt_idx" ON "ChatMessage"("leaderRoomId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_leaderRoomId_fkey" FOREIGN KEY ("leaderRoomId") REFERENCES "LeaderRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderRoom" ADD CONSTRAINT "LeaderRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderRoomMember" ADD CONSTRAINT "LeaderRoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "LeaderRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderRoomMember" ADD CONSTRAINT "LeaderRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
