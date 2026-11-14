-- 관리자 이용 정지 (SCRUM-204) — 끝나는 시각이 지나면 자동으로 풀린다. "해제할 때까지"는 9999년으로 둔다.
ALTER TABLE "User" ADD COLUMN "suspendedUntil" TIMESTAMP(3);
