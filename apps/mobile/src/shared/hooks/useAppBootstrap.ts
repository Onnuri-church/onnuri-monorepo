import { useEffect } from "react";

import { useAuthStore } from "../store/useAuthStore";

// 스플래시 최소 노출 시간. "이만큼 지연시킨다"가 아니라 "이보다 짧게 스쳐 지나가지 않는다"는 뜻이다 —
// 나중에 세션 복원 같은 실제 작업이 생기면 아래 Promise.all 배열에 추가하면 되고,
// 그 작업이 이 시간 안에 끝나는 한 체감 시간은 그대로다.
const MIN_SPLASH_DURATION_MS = 1500;

// 앱이 처음 뜰 때 한 번 도는 준비 작업. 끝나면 useAuthStore의 session이 loading에서 벗어나고,
// RootNavigator가 스플래시 대신 실제 화면 트리를 그린다.
export function useAppBootstrap() {
  const status = useAuthStore((state) => state.session.status);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    // 이미 확정된 뒤면 다시 돌리지 않는다 — 개발 중 fast refresh로 이 훅이 재실행돼도
    // 로그인해둔 세션이 초기화되지 않게 한다.
    if (status !== "loading") {
      return;
    }

    const minDuration = new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_DURATION_MS));

    Promise.all([minDuration]).then(() => {
      // 아직 복원할 세션이 없어서 "세션 없음"으로 확정만 한다. 저장된 토큰을 읽는 로직이 생기면
      // 복원에 성공했을 때 setSession을, 실패했을 때 이 clearSession을 부르는 자리가 된다.
      clearSession();
    });
  }, [status, clearSession]);
}
