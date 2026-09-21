import type { CellRole, MeResponse } from "@onnuri/shared";

// 개별 셀 페이지의 권한 규칙 + 갤러리 목업. 구성원·권한 근거는 서버 데이터(GET /cells/:id,
// GET /users/me), 소식은 /posts/cell-news 실데이터. 갤러리만 업로드 인프라 대기로 목업이다.

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

export interface GalleryMonth {
  /** 섹션 제목 (예: "2026년 7월") */
  month: string;
  /** 사진 연동 전이라 id만 있는 placeholder. 실제 이미지는 API 연동 시 붙는다. */
  photoIds: string[];
}

// 사진 API 전이라 개수만 의미 있는 placeholder 목록이다.
const MOCK_GALLERY: GalleryMonth[] = [
  { month: "2026년 7월", photoIds: Array.from({ length: 9 }, (_, i) => `2026-07-${i}`) },
  { month: "2026년 6월", photoIds: Array.from({ length: 9 }, (_, i) => `2026-06-${i}`) },
];

// 갤러리만 목업으로 남았다 — 이미지 업로드 인프라가 생기면 Image 테이블 조회로 교체한다.
// (소식은 /posts/cell-news 실데이터로 전환됨 — api.ts)
export function getCellGallery(_cellId: string): GalleryMonth[] {
  return MOCK_GALLERY;
}
