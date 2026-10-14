/*
  Warnings:

  - You are about to drop the column `method` on the `CellMeetingAttendance` table. All the data in the column will be lost.
  - Made the column `recordedById` on table `CellMeetingAttendance` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CellMeetingAttendance" DROP CONSTRAINT "CellMeetingAttendance_recordedById_fkey";

-- AlterTable
ALTER TABLE "CellMeetingAttendance" DROP COLUMN "method",
ALTER COLUMN "recordedById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CellMeetingAttendance" ADD CONSTRAINT "CellMeetingAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
