import { useEffect } from "react";

import { restoreSession } from "../api/session";
import { useAuthStore } from "../store/useAuthStore";

// 스플래시 최소 노출 시간. "이만큼 지연시킨다"가 아니라 "이보다 짧게 스쳐 지나가지 않는다"는 뜻이다 —
// 세션 복원이 이 시간 안에 끝나는 한 체감 시간은 그대로다.
const MIN_SPLASH_DURATION_MS = 1500;

// 앱이 처음 뜰 때 한 번 도는 준비 작업. 끝나면 useAuthStore의 session이 loading에서 벗어나고,
// RootNavigator가 스플래시 대신 실제 화면 트리를 그린다.
export function useAppBootstrap() {
  const status = useAuthStore((state) => state.session.status);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    // 이미 확정된 뒤면 다시 돌리지 않는다 — 개발 중 fast refresh로 이 훅이 재실행돼도
    // 로그인해둔 세션이 초기화되지 않게 한다.
    if (status !== "loading") {
      return;
    }

    const minDuration = new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_DURATION_MS));

    // 세션 확정은 restoreSession이 아니라 여기서 한다 — 복원이 일찍 끝나도
    // 스플래시 최소 노출 시간 전에 화면이 바뀌지 않게 하기 위해서다.
    Promise.all([minDuration, restoreSession()]).then(([, restored]) => {
      if (restored) {
        setSession(restored.user, restored.tokens);
      } else {
        clearSession();
      }
    });
  }, [status, setSession, clearSession]);
}
