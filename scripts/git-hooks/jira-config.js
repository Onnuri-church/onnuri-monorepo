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

  // 커밋 제목 형식: "<티켓키> <타입>: <내용>"
  // 예: SCRUM-12 feat: 로그인 세션 만료 처리 추가
  // 제목 맨 앞에 와야 하는 티켓키 패턴 (예: scrum-2, PROJ-123)
  ticketKeyPattern: /^[A-Za-z]{2,10}-\d+/,

  // 티켓키 다음에 와야 하는 타입. 표기 그대로만 통과시킨다(대소문자 구분) —
  // git log 모양을 일정하게 유지하는 게 이 규칙의 목적이라 Feat/FIX 같은 변형은 받지 않는다.
  commitTypes: [
    'feat', //     새로운 기능 추가
    'fix', //      버그 수정
    'docs', //     문서 수정 (코드 변경 없음)
    'style', //    코드 포맷팅, 세미콜론 등 스타일 변경 (논리 변경 없음)
    'refactor', // 리팩터링 (기능 변화 없음)
    'test', //     테스트 관련 코드 추가/수정
    'chore', //    빌드, 패키지 매니저 설정 등 기타 작업
    'design', //   CSS 등 사용자 UI 디자인 변경
    'comment', //  필요한 주석 추가 및 변경
    'rename', //   파일 혹은 폴더명을 수정하거나 옮기는 작업만인 경우
    'remove', //   파일을 삭제하는 작업만 수행한 경우
    '!HOTFIX', //  급하게 치명적인 버그를 고쳐야 하는 경우
  ],
};
