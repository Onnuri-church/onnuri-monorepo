import type { CellRole, MeResponse } from "@onnuri/shared";

// 개별 셀 페이지의 소식/갤러리 목업. 구성원·권한은 서버 데이터(GET /cells/:id, GET /users/me)로
// 전환됐고, 소식·갤러리는 게시판(Post) API가 생기면 이 파일을 지우고 교체한다.

/** 셀 안에서의 역할(화면 표시용). 부셀장(viceLeader)은 셀장과 동일 권한 — 표시만 구분한다 (docs/erd.md).
 * 서버 enum(CellRole)에서의 변환은 api.ts의 toCellMemberRole. */
export type CellMemberRole = "leader" | "viceLeader" | "member";

// 셀 권한은 유저 등급이 아니라 "그 셀에서의 내 멤버십 역할"로 판별한다 (셀장은 셀마다 다를 수
// 있으므로). 내 역할은 /users/me 응답(me.cell)에서 온다 — 화면이 useMe()로 읽어 넘긴다.
// 게스트·무소속(me 없음/다른 셀)은 열람만 가능하다.
function myRoleIn(cellId: string, me: MeResponse | undefined): CellRole | null {
  return me?.cell?.id === cellId ? me.cell.role : null;
}

// 소식 작성·갤러리 업로드 권한: 그 셀의 셀원 + 그 셀의 셀장(들) + 관리자 (2026-08-26 확정).
// 관리자는 소속과 무관하게 모든 셀에 작성·관리할 수 있다 (2026-09-10 확정).
export function canPostToCell(cellId: string, me: MeResponse | undefined): boolean {
  return me?.isAdmin === true || myRoleIn(cellId, me) !== null;
}

// 관리 탭·갤러리 삭제(편집) 권한: 그 셀의 셀장·부셀장과 관리자만.
export function canManageCell(cellId: string, me: MeResponse | undefined): boolean {
  const role = myRoleIn(cellId, me);
  return me?.isAdmin === true || role === "LEADER" || role === "SUB_LEADER";
}

// 팔로워 노트 작성 권한: 그 셀의 셀장·부셀장만 — 관리자는 작성은 못 하고 댓글(목사님 댓글)만
// 달 수 있다 (2026-09-10 확정, docs/erd.md FollowerNote/FollowerNoteComment 참고).
export function canWriteFollowerNote(cellId: string, me: MeResponse | undefined): boolean {
  const role = myRoleIn(cellId, me);
  return role === "LEADER" || role === "SUB_LEADER";
}

export interface CellMember {
  id: string;
  name: string;
  role: CellMemberRole;
}

export interface CellNews {
  id: string;
  title: string;
  body: string;
  /** 목록·상세에 그대로 보여주는 표시용 문자열. 화면이 시간 계산을 하지 않는다. */
  dateLabel: string;
  authorName: string;
  heartCount: number;
}

export interface GalleryMonth {
  /** 섹션 제목 (예: "2026년 7월") */
  month: string;
  /** 사진 연동 전이라 id만 있는 placeholder. 실제 이미지는 API 연동 시 붙는다. */
  photoIds: string[];
}

export interface CellDetail {
  news: CellNews[];
  gallery: GalleryMonth[];
}

const MOCK_NEWS: CellNews[] = [
  {
    id: "1",
    title: "이번 주 셀모임은 예배 후 투썸에서 진행해요!",
    body:
      "이번 주는 예배 마치고 바로 근처 투썸플레이스에서 모이려고 해요!\n\n" +
      "📍 장소: 투썸플레이스 (본당 앞 사거리)\n" +
      "🕐 시간: 예배 종료 후 (약 오후 1시경)\n\n" +
      "다과는 셀비로 준비할 예정이니 편하게 몸만 오시면 돼요~\n" +
      "혹시 늦으실 분들은 단톡방에 미리 말씀해주세요!\n\n" +
      "이번 주도 함께 은혜로운 시간 보내요 😊",
    dateLabel: "08월 21일 · 38분 전",
    authorName: "조인승",
    heartCount: 14,
  },
  {
    id: "2",
    title: "다음 달 아웃팅 날짜 정해요~!",
    body: "9월 아웃팅 날짜를 정하려고 해요. 단톡방 투표에 참여해주세요!",
    dateLabel: "08월 18일 · 3일 전",
    authorName: "조인승",
    heartCount: 8,
  },
  {
    id: "3",
    title: "새가족 박미경님을 환영해주세요!",
    body: "이번 주부터 우리 셀에 박미경님이 함께해요. 다들 따뜻하게 맞아주세요 🙌",
    dateLabel: "08월 14일 · 1주 전",
    authorName: "조인승",
    heartCount: 21,
  },
];

// 사진 API 전이라 개수만 의미 있는 placeholder 목록이다.
const MOCK_GALLERY: GalleryMonth[] = [
  { month: "2026년 7월", photoIds: Array.from({ length: 9 }, (_, i) => `2026-07-${i}`) },
  { month: "2026년 6월", photoIds: Array.from({ length: 9 }, (_, i) => `2026-06-${i}`) },
];

// 소식·갤러리만 목업으로 남았다 — 모든 셀이 같은 내용을 보여준다 (Post API 연동 시 cellId로 조회).
export function getCellDetail(_cellId: string): CellDetail {
  return { news: MOCK_NEWS, gallery: MOCK_GALLERY };
}

export function findCellNews(cellId: string, newsId: string): CellNews | undefined {
  return getCellDetail(cellId).news.find((news) => news.id === newsId);
}
