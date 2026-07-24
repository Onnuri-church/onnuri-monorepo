#!/usr/bin/env node
// PR merge 시 PR 본문의 4개 섹션(개요/기능/작업 내용/완료 조건)을
// 해당 Jira 티켓(들)의 Description(ADF)으로 덮어쓴다.
// 티켓키는 PR 제목 + PR에 포함된 모든 커밋 메시지에서 찾는다 —
// 커밋 3개가 각각 다른 티켓키를 가리켜도(SCRUM-12, SCRUM-13, SCRUM-14 커밋을
// 하나의 PR로 올리는 경우) 전부 찾아서 동일한 PR 본문 내용을 각 티켓에 반영한다.
// 필요한 env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, PR_TITLE, PR_BODY, PR_COMMITS_FILE

const fs = require('fs');
const { SECTION_HEADERS } = require('./sections-config');
const TICKET_KEY_PATTERN = /[A-Za-z]{2,10}-\d+/g;

function fail(message) {
  console.error(`[jira-description-sync] ${message}`);
  process.exit(1);
}

function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

function parseSections(body) {
  const cleaned = stripHtmlComments(body || '');
  const lines = cleaned.replace(/\r\n/g, '\n').split('\n');

  const sections = {};
  let currentHeader = null;
  let buffer = [];

  const flush = () => {
    if (currentHeader) {
      sections[currentHeader] = buffer.join('\n').trim();
    }
    buffer = [];
  };

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headerMatch && SECTION_HEADERS.includes(headerMatch[1].trim())) {
      flush();
      currentHeader = headerMatch[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  return sections;
}

function textBlockToAdfNodes(text) {
  const lines = (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const nodes = [];
  let bulletBuffer = [];

  const flushBullets = () => {
    if (bulletBuffer.length) {
      nodes.push({
        type: 'bulletList',
        content: bulletBuffer.map((item) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
        })),
      });
      bulletBuffer = [];
    }
  };

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
    } else {
      flushBullets();
      nodes.push({ type: 'paragraph', content: [{ type: 'text', text: line }] });
    }
  }
  flushBullets();

  return nodes;
}

function buildAdfDescription(sections) {
  const content = [];
  for (const header of SECTION_HEADERS) {
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: header }],
    });

    const nodes = textBlockToAdfNodes(sections[header]);
    if (nodes.length) {
      content.push(...nodes);
    } else {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: '(작성되지 않음)' }],
      });
    }
  }
  return { type: 'doc', version: 1, content };
}

async function main() {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, PR_TITLE, PR_BODY, PR_COMMITS_FILE } =
    process.env;

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    fail('JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN 환경변수가 필요합니다.');
  }
  if (!PR_TITLE) {
    fail('PR_TITLE 환경변수가 필요합니다.');
  }

  const commitSubjects = PR_COMMITS_FILE ? fs.readFileSync(PR_COMMITS_FILE, 'utf8') : '';
  const searchText = `${PR_TITLE}\n${commitSubjects}`;

  const matches = searchText.match(TICKET_KEY_PATTERN);
  if (!matches) {
    console.log('[jira-description-sync] PR 제목/커밋에서 티켓키를 찾지 못해 건너뜁니다.');
    return;
  }
  const issueKeys = [...new Set(matches.map((k) => k.toUpperCase()))];

  const sections = parseSections(PR_BODY);
  const description = buildAdfDescription(sections);
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  const errors = [];
  for (const issueKey of issueKeys) {
    const url = `${JIRA_BASE_URL.replace(/\/$/, '')}/rest/api/3/issue/${issueKey}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ fields: { description } }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      errors.push(`${issueKey} (${res.status}): ${text}`);
      continue;
    }
    console.log(`[jira-description-sync] ${issueKey} description 업데이트 완료`);
  }

  if (errors.length) {
    fail(`일부 티켓 업데이트 실패:\n${errors.join('\n')}`);
  }
}

if (require.main === module) {
  main().catch((err) => fail(err.stack || String(err)));
}

module.exports = { parseSections, buildAdfDescription, textBlockToAdfNodes };
