-- AlterTable
ALTER TABLE "Notice" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;


-- 지금 홈에 보이는 배너(가장 최근 등록 1건)를 켜진 상태로 옮겨 동작을 유지한다.
UPDATE "Notice" SET "isActive" = true
WHERE "id" = (SELECT "id" FROM "Notice" WHERE "type" = 'BANNER' ORDER BY "createdAt" DESC LIMIT 1);
