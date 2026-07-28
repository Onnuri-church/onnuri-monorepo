#!/usr/bin/env node
// PR merge 시 해당 Jira 티켓(들)을 완료 상태로 전환한다.
// 커밋의 #review 마커(-> #in-review)가 티켓을 리뷰 대기로 보내고, 완료는 여기서만 처리한다.
// 대상 티켓은 update-description.js와 동일하게 PR 제목 + PR 커밋 메시지에서 찾는다.
// 필요한 env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, PR_TITLE, PR_COMMITS_FILE

const fs = require('fs');
const { collectIssueKeys } = require('./issue-keys');
const { doneTransitionName } = require('../git-hooks/jira-config');

function fail(message) {
  console.error(`[jira-transition] ${message}`);
  process.exit(1);
}

async function main() {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, PR_TITLE, PR_COMMITS_FILE } = process.env;

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    fail('JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN 환경변수가 필요합니다.');
  }
  if (!PR_TITLE) {
    fail('PR_TITLE 환경변수가 필요합니다.');
  }

  const commitSubjects = PR_COMMITS_FILE ? fs.readFileSync(PR_COMMITS_FILE, 'utf8') : '';
  const issueKeys = collectIssueKeys(`${PR_TITLE}\n${commitSubjects}`);
  if (!issueKeys.length) {
    console.log('[jira-transition] PR 제목/커밋에서 티켓키를 찾지 못해 건너뜁니다.');
    return;
  }

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const baseUrl = JIRA_BASE_URL.replace(/\/$/, '');

  const errors = [];
  for (const issueKey of issueKeys) {
    const url = `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`;

    // 전환은 ID로만 실행할 수 있고, ID는 프로젝트마다 다르므로 먼저 이름으로 찾는다.
    const listRes = await fetch(url, { headers });
    if (!listRes.ok) {
      const text = await listRes.text().catch(() => '');
      errors.push(`${issueKey} 전환 목록 조회 실패 (${listRes.status}): ${text}`);
      continue;
    }

    const { transitions = [] } = await listRes.json();
    const target = transitions.find(
      (t) => t.name.toLowerCase() === doneTransitionName.toLowerCase(),
    );

    // 이름 오타와 "현재 상태에서 갈 수 없는 전환"은 둘 다 여기로 떨어져 구분이 안 되므로,
    // 실제 가능한 전환 이름을 같이 찍어 어느 쪽인지 로그만 보고 판단할 수 있게 한다.
    if (!target) {
      const available = transitions.map((t) => t.name).join(', ') || '(없음)';
      errors.push(
        `${issueKey}: "${doneTransitionName}" 전환을 찾지 못했습니다. 가능한 전환: ${available}`,
      );
      continue;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transition: { id: target.id } }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      errors.push(`${issueKey} 전환 실행 실패 (${res.status}): ${text}`);
      continue;
    }
    console.log(`[jira-transition] ${issueKey} -> ${target.name} 전환 완료`);
  }

  if (errors.length) {
    fail(`일부 티켓 전환 실패:\n${errors.join('\n')}`);
  }
}

if (require.main === module) {
  main().catch((err) => fail(err.stack || String(err)));
}
