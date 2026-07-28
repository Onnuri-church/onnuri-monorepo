#!/usr/bin/env node
// jira-config.js / sections-config.js 값이 바뀌면 CONTRIBUTING.md의
// AUTO-GENERATED 구간을 다시 생성한다. pre-commit 훅에서 매 커밋마다 실행됨.
const fs = require('fs');
const path = require('path');

const {
  reviewMarker,
  reviewCommand,
  doneTransitionName,
  commitTypes,
} = require('../git-hooks/jira-config');
const { SECTION_HEADERS } = require('./sections-config');

const CONTRIBUTING_PATH = path.join(__dirname, '..', '..', 'CONTRIBUTING.md');
const START_MARKER = '<!-- AUTO-GENERATED:JIRA-CONFIG:START -->';
const END_MARKER = '<!-- AUTO-GENERATED:JIRA-CONFIG:END -->';

function buildBlock() {
  const sectionList = SECTION_HEADERS.map((h) => `- ${h}`).join('\n');

  return `${START_MARKER}
<!-- 이 구간은 scripts/jira/generate-docs.js가 자동으로 생성합니다. 직접 수정하지 마세요. -->

- 커밋 제목 형식: \`<티켓키> <타입>: <내용>\` (예: \`SCRUM-12 feat: 로그인 세션 만료 처리 추가\`)
- 사용 가능한 타입 (표기 그대로만 통과): ${commitTypes.map((t) => `\`${t}\``).join(', ')}
- 리뷰 요청 마커: \`${reviewMarker}\` (커밋 메시지에 붙이면 Jira 명령 \`${reviewCommand}\`로 변환되어, push 시 티켓이 리뷰 대기 상태로 이동)
- 완료 처리: 커밋 마커 없음 — PR이 merge될 때 \`${doneTransitionName}\` 전환이 자동 실행됨
- PR 본문 섹션 (Jira Description으로 그대로 반영됨):
${sectionList}
${END_MARKER}`;
}

function main() {
  const original = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');

  const startIdx = original.indexOf(START_MARKER);
  const endIdx = original.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    console.error('[generate-docs] CONTRIBUTING.md에서 AUTO-GENERATED 마커를 찾지 못했습니다.');
    process.exit(1);
  }

  const before = original.slice(0, startIdx);
  const after = original.slice(endIdx + END_MARKER.length);
  const updated = `${before}${buildBlock()}${after}`;

  if (updated === original) {
    console.log('[generate-docs] CONTRIBUTING.md 변경 없음');
    return;
  }

  fs.writeFileSync(CONTRIBUTING_PATH, updated);
  console.log('[generate-docs] CONTRIBUTING.md 자동 갱신 완료');
}

main();
