import type { AdminMemberSummary } from "@onnuri/shared";

export interface MemberOption {
  id: string;
  /** SelectField에 그대로 넣는 표시 문자열 — 목록 안에서 유일함을 보장한다 */
  label: string;
}

// 셀장/소그룹장 선택지용 — SelectField가 문자열만 다뤄서 이름 대신 "이름 (소속)" 라벨을
// 만들어 겹침을 없애고, 라벨↔id 변환으로 동명이인 문제를 푼다.
// 소속까지 같아 라벨이 겹치는 극단적 경우만 뒤에 번호를 붙인다 (홍길동 (누리셀) 2).
export function buildMemberOptions(members: AdminMemberSummary[] | undefined): MemberOption[] {
  const seen = new Map<string, number>();
  return (members ?? []).map((member) => {
    const affiliation = [member.cellName, member.teamName].filter(Boolean).join("·");
    const base = affiliation ? `${member.name} (${affiliation})` : member.name;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { id: member.id, label: count === 1 ? base : `${base} ${count}` };
  });
}

export function findOptionByLabel(options: MemberOption[], label: string | null) {
  return options.find((option) => option.label === label) ?? null;
}

export function findOptionById(options: MemberOption[], id: string | null) {
  return options.find((option) => option.id === id) ?? null;
}
