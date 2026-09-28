import type { MeResponse } from "@onnuri/shared";

// 부서활동 작성 권한: 어느 부서든 소속돼 있으면 자기 부서에 쓸 수 있고, 관리자는 부서와
// 무관하게 모든 부서에 쓸 수 있다 (서버 PostsService.assertCanPostToTeam과 같은 규칙).
// 게스트는 me가 undefined라 자동으로 false다.
export function canWriteTeamActivity(me: MeResponse | undefined): boolean {
  return me?.isAdmin === true || me?.team != null;
}

// 작성 화면에서 고를 수 있는 부서. 관리자가 아니면 내 부서 하나뿐이다 — 고를 수 있는데
// 서버가 막는 상황(403)을 만들지 않으려고 선택지 자체를 좁힌다.
export function writableTeamNames(
  me: MeResponse | undefined,
  allTeamNames: string[],
): string[] {
  if (me?.isAdmin) return allTeamNames;
  return me?.team ? [me.team.name] : [];
}
