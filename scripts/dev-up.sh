#!/usr/bin/env bash
# 개발 환경 복구 한 방 스크립트 (개발 전용 — 출시 정리 때 삭제 대상).
#
# 하는 일: USB 터널(adb reverse) 복구 → Metro/API 헬스체크 → (옵션) 앱 재시작.
# 터널은 USB를 뽑았다 꽂을 때마다 끊기므로 "연결이 안 되네" 증상이면 먼저 이걸 돌린다.
#
# 사용법:
#   scripts/dev-up.sh            # 터널 복구 + 상태 출력
#   scripts/dev-up.sh --restart  # 위 작업 + 앱 강제 재시작(새 번들 로드)
set -u

APP_ID="com.onnuri.mobile"

echo "── 기기 연결 ──"
if ! adb devices | grep -q "device$"; then
  echo "❌ 연결된 기기가 없어요. USB 연결 확인 (안 잡히면: adb kill-server 후 재시도)"
  exit 1
fi
adb devices | grep "device$"

echo "── 터널 복구 ──"
adb reverse tcp:8081 tcp:8081 >/dev/null && adb reverse tcp:3000 tcp:3000 >/dev/null
adb reverse --list

echo "── 서버 상태 ──"
metro=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 localhost:8081/status || true)
api=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 localhost:3000/sermons || true)
if [ "$metro" = "200" ]; then echo "✅ Metro (8081)"; else
  echo "❌ Metro 꺼짐 → pnpm --filter @onnuri/mobile exec expo start --dev-client"
fi
if [ "$api" = "200" ]; then echo "✅ API (3000)"; else
  echo "❌ API 꺼짐 → pnpm --filter @onnuri/api run start:dev"
fi

if [ "${1:-}" = "--restart" ]; then
  echo "── 앱 재시작 ──"
  adb shell am force-stop "$APP_ID"
  adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  echo "✅ 재시작함 (번들 로드까지 20~40초)"
fi
