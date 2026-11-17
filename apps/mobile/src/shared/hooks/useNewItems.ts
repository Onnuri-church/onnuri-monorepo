import { useRef } from "react";

// 목록에서 "화면을 연 뒤 새로 생긴" 항목만 골라낸다 (SCRUM-215) — 등장 애니메이션을 그 항목에만 주려고.
// 처음 데이터가 들어온 순간의 id들을 기준으로 삼는다. 내가 먼저 그려 둔(보내는 중) 항목이 서버 id로
// 바뀔 때는 markSeen으로 미리 등록해 같은 내용이 두 번 나타나는 것처럼 보이지 않게 한다.
export function useNewItems(ids: readonly string[] | undefined) {
  const seen = useRef<Set<string> | null>(null);
  if (ids && seen.current === null) seen.current = new Set(ids);
  return {
    isNew: (id: string) => seen.current !== null && !seen.current.has(id),
    markSeen: (id: string) => {
      seen.current?.add(id);
    },
  };
}
