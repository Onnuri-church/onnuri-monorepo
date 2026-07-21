// PR 본문 -> Jira Description으로 옮겨지는 섹션 목록.
// 여기를 바꾸면 PR 템플릿과 CONTRIBUTING.md도 함께 맞춰야 하며,
// CONTRIBUTING.md의 자동 생성 구간은 pre-commit 훅이 알아서 갱신한다.
module.exports = {
  SECTION_HEADERS: ['개요', '기능', '작업 내용', '완료 조건'],
};
