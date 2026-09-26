import type { MeResponse } from "@onnuri/shared";

// 팀 페이지의 권한 규칙. 셀(features/cell/cellDetail.ts)과 같은 방식으로,
// 유저 등급이 아니라 "그 팀에서의 내 멤버십 역할"로 판별한다 — 팀장은 팀마다 다르다.
// 내 역할은 /users/me 응답(me.team)에서 온다 — 화면이 useMe()로 읽어 넘긴다.
// 게스트·무소속(me 없음/다른 팀)은 열람만 가능하다.

// 갤러리 사진 추가·삭제 권한: 그 팀의 팀장과 관리자.
// (docs/attendance-data-model.md §1 "팀장: 활동 사진 추가(팀 갤러리)" — 팀원은 포함하지 않는다.)
// 관리자는 소속과 무관하게 모든 팀을 관리할 수 있다 (셀과 같은 규칙).
export function canManageTeamGallery(teamId: string, me: MeResponse | undefined): boolean {
  if (me?.isAdmin === true) return true;
  return me?.team?.id === teamId && me.team.role === "LEADER";
}
