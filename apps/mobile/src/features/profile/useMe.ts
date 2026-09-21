import type { MeResponse } from "@onnuri/shared";
import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "../../shared/store/useAuthStore";
import { fetchMe } from "./api";

// 로그인한 내 정보(소속·역할 포함) — 로그인 직후 RootNavigator가 prefetch해두는 ["me"] 캐시를
// 같이 쓴다. 게스트는 조회하지 않고 undefined를 돌려주므로, 권한 계산은 "없으면 불가"로 떨어진다.
export function useMe(): MeResponse | undefined {
  const session = useAuthStore((state) => state.session);
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: session.status === "authenticated",
  });
  return data;
}
