-- CreateEnum
CREATE TYPE "OffDayKind" AS ENUM ('WORSHIP_OFF', 'CELL_MEETING_OFF', 'BOTH_OFF');

-- CreateTable
CREATE TABLE "OffDay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "OffDayKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OffDay_date_key" ON "OffDay"("date");

