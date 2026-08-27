// 팔로워 노트 목업. API가 생기면 이 파일을 지우고 서버 데이터로 교체한다.
// 노트는 셀모임 날짜(일요일) 단위로 셀장이 쓰는 주간 보고다 — 열람·작성 권한은
// 그 셀의 셀장(부셀장 포함)과 관리자뿐(canManageCell). 관리자(목사님) 댓글은
// "목사님 댓글"로 표시된다.

export interface NoteComment {
  id: string;
  authorName: string;
  /** 이미 가공된 표시용 문자열 (예: "08.02"). 화면이 시간 계산을 하지 않는다. */
  timeAgo: string;
  content: string;
  /** 관리자(목사님) 댓글 여부 — 게시판 카드의 "목사님 댓글" 표시에 쓴다. */
  isPastor: boolean;
}

export interface FollowerNote {
  id: string;
  /** "2026.08.02" */
  dateLabel: string;
  /** 노트가 속한 달 (게시판 월 필터용) */
  month: number;
  /** 날짜 옆 캡션: "(일) 셀모임" */
  meetingLabel: string;
  authorName: string;
  /** 작성 시점 표시용 문자열 */
  writtenAgo: string;
  /** NOTE_QUESTIONS 순서와 같은 3문항 답변 */
  answers: string[];
  comments: NoteComment[];
}

// 작성 화면의 3문항 (시안 확정 문구). 상세 화면의 섹션 제목도 이걸 쓴다.
export const NOTE_QUESTIONS = [
  { title: "요즘 상황과 기도제목", placeholder: "근황, 고민, 함께 기도했으면 하는 부분" },
  { title: "나눔 중 함께 이야기하면 좋을 것", placeholder: "다음 모임 때 자연스럽게 물어볼 이야기" },
  { title: "궁금한 점이나 하고 싶은 말", placeholder: "더 챙기고 싶은 것, 남기고 싶은 메모" },
];

const MOCK_NOTES: FollowerNote[] = [
  {
    id: "1",
    dateLabel: "2026.08.16",
    month: 8,
    meetingLabel: "(일) 셀모임",
    authorName: "이서연",
    writtenAgo: "08월 17일 · 1주 전",
    answers: [
      "민준) 취업 준비로 많이 지쳐 보임. 계속 기도 부탁드려요.\n지우) 최근 2주 연속 결석. 가족 문제로 맘이 힘든 상태.",
      "준혁) 새 가족으로 처음 참석. 내향인이라 적응이 필요하고 직장에서 관계 문제로 고민이라고 함.",
      "지우) 다음 주 참석 예정. 한번 더 연락해보기.",
    ],
    comments: [
      {
        id: "1",
        authorName: "원준호",
        timeAgo: "08.17",
        content:
          "한 주 동안 셀원들 마음 잘 챙겨주셔서 감사해요. 민준 형제님, 지우 자매님 위해 함께 기도하겠습니다.",
        isPastor: true,
      },
      {
        id: "2",
        authorName: "이서연",
        timeAgo: "08.17",
        content: "감사합니다 목사님, 이번 주 셀모임 때 두 분 마음 더 살펴볼게요.",
        isPastor: false,
      },
    ],
  },
  {
    id: "2",
    dateLabel: "2026.08.09",
    month: 8,
    meetingLabel: "(일) 셀모임",
    authorName: "이서연",
    writtenAgo: "08월 10일 · 2주 전",
    answers: [
      "새가족 미경님이 잘 적응하고 있어요. 감사한 한 주였습니다.",
      "아웃팅 장소 아이디어를 셀원들에게 미리 물어보면 좋을 것 같아요.",
      "",
    ],
    comments: [
      {
        id: "1",
        authorName: "원준호",
        timeAgo: "08.10",
        content: "미경 자매님 정착을 위해 함께 기도할게요!",
        isPastor: true,
      },
    ],
  },
  {
    id: "3",
    dateLabel: "2026.08.02",
    month: 8,
    meetingLabel: "(일) 셀모임",
    authorName: "이서연",
    writtenAgo: "08월 03일 · 3주 전",
    answers: ["다들 방학·휴가 시즌이라 근황 나눔 위주로 진행했어요.", "", ""],
    comments: [],
  },
];

export function getFollowerNotes(_cellId: string): FollowerNote[] {
  return MOCK_NOTES;
}

export function findFollowerNote(cellId: string, noteId: string): FollowerNote | undefined {
  return getFollowerNotes(cellId).find((note) => note.id === noteId);
}
