// Jira 자동화 설정
// 티켓 상태는 두 시점에 두 가지 방식으로 움직인다 — 아래 두 값이 각각을 담당한다.
module.exports = {
  // [푸시 시] 커밋 메시지에 이 마커를 붙이면 "리뷰 요청"으로 인식한다.
  // 예: "scrum-2: 로그인 버그 수정 #review"
  reviewMarker: '#review',

  // 위 마커가 치환되는 Jira 스마트 커밋 명령. 푸시되면 Jira-GitHub 연동 앱이
  // 이 명령을 읽어 티켓을 In Review로 옮긴다 (REST API를 쓰지 않으므로 토큰 불필요).
  // 스마트 커밋 문법이라 전환 이름의 공백은 하이픈으로 적는다 ("In Review" -> #in-review).
  // TODO: Jira 워크플로우의 실제 전환 이름 확인 후 수정 (프로젝트 설정 > 워크플로)
  reviewCommand: '#in-review',

  // [PR 머지 시] scripts/jira/transition-issues.js가 REST API로 실행할 완료 전환 이름.
  // 위 reviewCommand와 달리 하이픈으로 바꾸지 않고 Jira에 표시된 이름 그대로 적는다.
  // TODO: Jira 워크플로우의 실제 전환 이름 확인 후 수정
  doneTransitionName: 'Done',

  // 커밋 제목 맨 앞에 와야 하는 티켓키 패턴 (예: scrum-2, PROJ-123)
  ticketKeyPattern: /^([A-Za-z]{2,10}-\d+)\s*:?\s*(.*)$/,
};
