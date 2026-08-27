import type { UserRole } from "../my-page/types";
import { MY_CELL_ID, findCell } from "./cells";

// 개별 셀 페이지(소식/갤러리/구성원/관리) 목업. 셀 API가 생기면 이 파일을 지우고 서버 데이터로 교체한다.
// 셀은 관리자가 생성/종료하는 유동 데이터라(생성 시 셀장·구성원·기간 지정 — 어드민 화면은 MVP 이후),
// 화면은 cellId로 어떤 셀이든 그릴 수 있게 만들고 내용만 여기서 공급한다.

// 내 등급 목업 — 마이페이지 MOCK_PROFILE.role과 같은 임시 값이다. "cellLeader"나 "admin"으로
// 바꾸면 관리 탭 잠금 해제·갤러리 편집을 확인할 수 있다. 내 소속 셀은 MY_CELL_ID(누리셀)를
// 따른다 — 유저 정보 연동 시 함께 정리.
export const MOCK_MY_ROLE: UserRole = "member";

// 이 셀에 속해 있는가 — 셀원·셀장(부셀장 포함) 모두 소속 셀 기준으로 판별하고, 관리자는 소속과
// 무관하게 모든 셀에 접근한다. API 연동 시 셀 멤버십 조회로 교체.
function belongsToCell(cellId: string, role: UserRole): boolean {
  return role === "admin" || cellId === MY_CELL_ID;
}

// 소식 작성·갤러리 업로드 권한: 그 셀의 셀원 + 그 셀의 셀장(들) + 관리자 (2026-08-26 확정).
// 다른 셀 유저는 열람만 가능하다.
export function canPostToCell(cellId: string, role: UserRole = MOCK_MY_ROLE): boolean {
  return belongsToCell(cellId, role);
}

// 관리 탭·갤러리 삭제(편집) 권한: 그 셀의 셀장(부셀장 포함)과 관리자만.
export function canManageCell(cellId: string, role: UserRole = MOCK_MY_ROLE): boolean {
  return role === "admin" || (role === "cellLeader" && cellId === MY_CELL_ID);
}

export interface CellMember {
  id: string;
  name: string;
  role: "leader" | "viceLeader" | "member";
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
  members: CellMember[];
  news: CellNews[];
  gallery: GalleryMonth[];
}

const MOCK_MEMBER_NAMES = ["고다원", "박서준", "최유진", "이하은", "정민재", "김소율", "오예준"];

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

export function getCellDetail(cellId: string): CellDetail {
  const cell = findCell(cellId);

  const members: CellMember[] = [];
  if (cell) {
    members.push({ id: "leader", name: cell.leaderName, role: "leader" });
    if (cell.viceLeaderName) {
      members.push({ id: "viceLeader", name: cell.viceLeaderName, role: "viceLeader" });
    }
  }
  MOCK_MEMBER_NAMES.forEach((name, index) =>
    members.push({ id: `member-${index}`, name, role: "member" }),
  );

  return { members, news: MOCK_NEWS, gallery: MOCK_GALLERY };
}

export function findCellNews(cellId: string, newsId: string): CellNews | undefined {
  return getCellDetail(cellId).news.find((news) => news.id === newsId);
}
