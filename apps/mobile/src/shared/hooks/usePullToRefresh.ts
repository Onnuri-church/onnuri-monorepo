import { useState } from "react";

// 당겨서 새로고침 스피너 — React Query의 isRefetching은 백그라운드 갱신(다른 화면의 invalidate,
// refetchInterval)에도 켜져서, 채팅방에서 돌아오기만 해도 목록 위에 로딩 스피너가 돈다.
// 사용자가 직접 당긴 동안만 true가 되게 따로 들고 있는다. <RefreshControl {...pull} />로 쓴다.
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };
  return { refreshing, onRefresh };
}
