-- 팀 팔로워 노트 (SCRUM-180)
-- CreateTable
CREATE TABLE "TeamFollowerNote" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "editedById" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFollowerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamFollowerNoteComment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFollowerNoteComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamFollowerNote_teamId_createdAt_idx" ON "TeamFollowerNote"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamFollowerNoteComment_noteId_createdAt_idx" ON "TeamFollowerNoteComment"("noteId", "createdAt");

-- AddForeignKey
ALTER TABLE "TeamFollowerNote" ADD CONSTRAINT "TeamFollowerNote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFollowerNote" ADD CONSTRAINT "TeamFollowerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFollowerNote" ADD CONSTRAINT "TeamFollowerNote_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFollowerNoteComment" ADD CONSTRAINT "TeamFollowerNoteComment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "TeamFollowerNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFollowerNoteComment" ADD CONSTRAINT "TeamFollowerNoteComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFollowerNoteComment" ADD CONSTRAINT "TeamFollowerNoteComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TeamFollowerNoteComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
