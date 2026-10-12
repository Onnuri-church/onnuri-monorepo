-- CreateEnum
CREATE TYPE "AttendanceKind" AS ENUM ('WORSHIP', 'CELL_MEETING');

-- CreateTable
CREATE TABLE "AttendanceEditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "AttendanceKind" NOT NULL,
    "before" BOOLEAN NOT NULL,
    "after" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceEditLog_userId_date_idx" ON "AttendanceEditLog"("userId", "date");

-- CreateIndex
CREATE INDEX "AttendanceEditLog_createdAt_idx" ON "AttendanceEditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AttendanceEditLog" ADD CONSTRAINT "AttendanceEditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEditLog" ADD CONSTRAINT "AttendanceEditLog_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

