-- DropForeignKey
ALTER TABLE "CellMeetingAttendance" DROP CONSTRAINT "CellMeetingAttendance_recordedById_fkey";

-- AlterTable
ALTER TABLE "CellMeetingAttendance" ADD COLUMN     "method" "AttendanceMethod" NOT NULL DEFAULT 'QR',
ALTER COLUMN "recordedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CellMeetingAttendance" ADD CONSTRAINT "CellMeetingAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
