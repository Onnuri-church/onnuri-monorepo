-- QR 출석 마감을 14:30 → 17:00(KST)으로 연장한다. 이미 만들어진 회차 중 기본 마감(14:30)인 것만 옮긴다.
UPDATE "WorshipService"
SET "qrClosesAt" = "date" + interval '8 hours'
WHERE "qrClosesAt" = "date" + interval '5 hours 30 minutes';
