-- 관리자 팔로워 노트 열람 시각 (SCRUM-181)
-- CreateTable
CREATE TABLE "FollowerNoteView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cellId" TEXT,
    "teamId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowerNoteView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowerNoteView_userId_cellId_key" ON "FollowerNoteView"("userId", "cellId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerNoteView_userId_teamId_key" ON "FollowerNoteView"("userId", "teamId");

-- AddForeignKey
ALTER TABLE "FollowerNoteView" ADD CONSTRAINT "FollowerNoteView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerNoteView" ADD CONSTRAINT "FollowerNoteView_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerNoteView" ADD CONSTRAINT "FollowerNoteView_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
