#!/usr/bin/env node
// jira-config.js / sections-config.js 값이 바뀌면 CONTRIBUTING.md의
// AUTO-GENERATED 구간을 다시 생성한다. pre-commit 훅에서 매 커밋마다 실행됨.
const fs = require('fs');
const path = require('path');

const { doneMarker, doneCommand } = require('../git-hooks/jira-config');
const { SECTION_HEADERS } = require('./sections-config');

const CONTRIBUTING_PATH = path.join(__dirname, '..', '..', 'CONTRIBUTING.md');
const START_MARKER = '<!-- AUTO-GENERATED:JIRA-CONFIG:START -->';
const END_MARKER = '<!-- AUTO-GENERATED:JIRA-CONFIG:END -->';

function buildBlock() {
  const sectionList = SECTION_HEADERS.map((h) => `- ${h}`).join('\n');

  return `${START_MARKER}
<!-- 이 구간은 scripts/jira/generate-docs.js가 자동으로 생성합니다. 직접 수정하지 마세요. -->

- 완료 마커: \`${doneMarker}\` (커밋 메시지 끝에 붙이면 실제 Jira 명령 \`${doneCommand}\`로 변환됨)
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
