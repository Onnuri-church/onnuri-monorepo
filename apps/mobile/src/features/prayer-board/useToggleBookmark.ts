import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { toggleBookmark } from "./api";

// 북마크를 켜고 끈다. 목록(게시판·저장한·내 기도제목)과 상세가 같은 상태를 보도록
// 바꾼 뒤 기도제목 쿼리를 전부 다시 받는다 — 저장을 풀면 "저장한 기도제목"에서도 바로 빠진다.
// useCallback으로 고정한다 — 상세 화면이 이 함수를 헤더를 다시 그리는 effect의 의존성으로 쓰는데,
// 매번 새 함수면 렌더마다 setOptions가 돌아 무한 루프가 된다.
export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useCallback(
    async (id: string) => {
      await toggleBookmark(id);
      await queryClient.invalidateQueries({ queryKey: ["prayers"] });
      await queryClient.invalidateQueries({ queryKey: ["prayer", id] });
    },
    [queryClient],
  );
}
