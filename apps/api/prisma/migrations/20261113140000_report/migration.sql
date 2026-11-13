-- 신고 (SCRUM-199)
ALTER TYPE "NotificationType" ADD VALUE 'REPORT';

CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT', 'CHAT_MESSAGE', 'TEAM_BOARD_POST', 'TEAM_BOARD_COMMENT');
CREATE TYPE "ReportReason" AS ENUM ('ABUSE', 'SEXUAL', 'SPAM', 'PRIVACY', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'HIDDEN', 'DISMISSED');

CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetAuthorId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "snapshot" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "handledAt" TIMESTAMP(3),
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Report_reporterId_targetType_targetId_key" ON "Report"("reporterId", "targetType", "targetId");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetAuthorId_fkey" FOREIGN KEY ("targetAuthorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
