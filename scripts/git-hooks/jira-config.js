// Jira Smart Commit 자동화 설정
// 워크플로우 전환 이름이 바뀌면 doneCommand만 수정하면 됩니다.
module.exports = {
  // 커밋 메시지 맨 끝에 이 마커를 붙이면 완료 처리로 인식합니다.
  // 예: "scrum-2: 로그인 버그 수정 #close"
  doneMarker: '#close',

  // 위 마커가 실제로 호출하는 Jira 전환 명령입니다.
  // Jira 프로젝트 워크플로우의 "Done" 전환에 대응 (Settings > Workflow에서 확인/변경).
  doneCommand: '#done',

  // 커밋 제목 맨 앞에 와야 하는 티켓키 패턴 (예: scrum-2, PROJ-123)
  ticketKeyPattern: /^([A-Za-z]{2,10}-\d+)\s*:?\s*(.*)$/,
};
