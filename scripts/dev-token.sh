#!/usr/bin/env bash
# dev 로그인 토큰 발급 (개발 전용 — 출시 정리 때 삭제 대상. 서버 AUTH_DEV_LOGIN 필요).
#
# 사용법:
#   scripts/dev-token.sh                          # dev-admin 토큰
#   scripts/dev-token.sh dev@onnuri.local         # 특정 계정
#   scripts/dev-token.sh new@onnuri.local MEMBER  # 역할 지정(MEMBER/TEAM_LEADER/CELL_LEADER/ADMIN)
#
# 출력은 accessToken 한 줄 — 그대로 변수에 담아 쓴다:
#   TOKEN=$(scripts/dev-token.sh) && curl -s localhost:3000/users/me -H "Authorization: Bearer $TOKEN"
set -eu

EMAIL="${1:-dev-admin@onnuri.local}"
ROLE="${2:-}"

if [ -n "$ROLE" ]; then
  BODY="{\"email\":\"$EMAIL\",\"role\":\"$ROLE\"}"
else
  BODY="{\"email\":\"$EMAIL\"}"
fi

curl -s -X POST localhost:3000/auth/login/dev \
  -H "Content-Type: application/json" -d "$BODY" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.accessToken){console.error('로그인 실패:',d);process.exit(1)}console.log(j.accessToken)})"
