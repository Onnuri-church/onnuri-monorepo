// PR 제목 + PR에 포함된 커밋 메시지에서 Jira 티켓키를 추출한다.
// update-description.js와 transition-issues.js가 항상 같은 티켓 집합을 대상으로 하도록
// 추출 규칙을 여기 한 곳에만 둔다.
const TICKET_KEY_PATTERN = /[A-Za-z]{2,10}-\d+/g;

// 중복 제거 + 대문자 정규화된 티켓키 배열을 돌려준다 (없으면 빈 배열).
function collectIssueKeys(searchText) {
  const matches = (searchText || '').match(TICKET_KEY_PATTERN);
  if (!matches) {
    return [];
  }
  return [...new Set(matches.map((key) => key.toUpperCase()))];
}

module.exports = { collectIssueKeys };
