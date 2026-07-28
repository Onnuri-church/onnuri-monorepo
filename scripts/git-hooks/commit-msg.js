#!/usr/bin/env node
// commit-msg 훅: 커밋 메시지 맨 앞에 Jira 티켓키가 있는지만 검증한다.
// 나머지 내용은 건드리지 않는다 — 커밋 메시지는 순수 git 기록/상태관리용이고,
// Jira에는 자동으로 댓글이 달리지 않는다 (Description은 PR merge 시 별도 자동화로 채워짐).
// 유일한 예외: #review 마커는 실제 Jira 전환 명령(reviewCommand)으로 바뀌어
// 티켓을 리뷰 대기 상태로 옮긴다. 완료 처리는 커밋이 아니라 PR merge 시점에
// 별도 자동화(scripts/jira/transition-issues.js)가 담당한다.
// 사용법: "SCRUM-12: 내가 쓰고 싶은 내용 자유롭게 #review" -> "SCRUM-12: 내가 쓰고 싶은 내용 자유롭게 #in-review"
const fs = require('fs');
const { reviewMarker, reviewCommand, ticketKeyPattern } = require('./jira-config');

const msgFile = process.argv[2];
if (!msgFile) {
  console.error('commit-msg.js: commit message file path가 필요합니다.');
  process.exit(1);
}

const raw = fs.readFileSync(msgFile, 'utf8');
const subject = raw.replace(/\r\n/g, '\n').split('\n')[0] ?? '';

const isMergeCommit = /^Merge (branch|pull request|remote-tracking branch)/i.test(subject.trim());
if (isMergeCommit) {
  process.exit(0);
}

if (!ticketKeyPattern.test(subject)) {
  console.error('\n[jira-smart-commit] 커밋 메시지 맨 앞에 Jira 티켓키가 있어야 합니다.');
  console.error('  예시: SCRUM-12: 내가 쓰고 싶은 내용 자유롭게 ' + reviewMarker + '\n');
  process.exit(1);
}

const reviewMarkerRegex = new RegExp(`${escapeRegExp(reviewMarker)}\\b`, 'gi');
if (reviewMarkerRegex.test(raw)) {
  const updated = raw.replace(reviewMarkerRegex, reviewCommand);
  fs.writeFileSync(msgFile, updated);
}

process.exit(0);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
