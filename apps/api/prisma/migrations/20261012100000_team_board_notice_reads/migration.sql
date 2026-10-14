-- AlterTable
ALTER TABLE "TeamBoardPost" ADD COLUMN     "noticeAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TeamBoardRead" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamBoardRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamBoardRead_postId_userId_key" ON "TeamBoardRead"("postId", "userId");

-- AddForeignKey
ALTER TABLE "TeamBoardRead" ADD CONSTRAINT "TeamBoardRead_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TeamBoardPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBoardRead" ADD CONSTRAINT "TeamBoardRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

