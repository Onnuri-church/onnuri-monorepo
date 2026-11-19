-- 운영 지표 (SCRUM-249·250) — 활성 사용자 기록, 서버 요청 집계
CREATE TABLE "UserActivityDay" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityDay_pkey" PRIMARY KEY ("userId","date")
);

CREATE INDEX "UserActivityDay_date_idx" ON "UserActivityDay"("date");

ALTER TABLE "UserActivityDay" ADD CONSTRAINT "UserActivityDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ApiRequestStat" (
    "id" TEXT NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalMs" INTEGER NOT NULL DEFAULT 0,
    "maxMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiRequestStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiRequestStat_hour_method_route_key" ON "ApiRequestStat"("hour", "method", "route");

CREATE INDEX "ApiRequestStat_hour_idx" ON "ApiRequestStat"("hour");
