import { useCallback, useEffect, useState } from "react";

import { queryClient } from "../api/queryClient";
import { restoreSession } from "../api/session";
import { useAuthStore } from "../store/useAuthStore";

// 스플래시 최소 노출 시간. "이만큼 지연시킨다"가 아니라 "이보다 짧게 스쳐 지나가지 않는다"는 뜻이다 —
// 세션 복원이 이 시간 안에 끝나는 한 체감 시간은 그대로다.
const MIN_SPLASH_DURATION_MS = 1500;
// 이보다 오래 걸리면 스플래시에 "연결 중" 안내를 띄운다 — 멈춘 게 아니라 기다리는 중임을 알린다.
const SLOW_NOTICE_MS = 4000;
// 서버에 닿지 못하면(네트워크·서버가 잠에서 깨는 중) 로그인 화면으로 보내지 않고 이만큼 다시 시도한다.
// 서버가 깨는 데 1분 가까이 걸릴 수 있어 그보다 넉넉히 잡는다. 넘기면 "다시 시도" 버튼을 보여준다.
const RETRY_BUDGET_MS = 90_000;
const RETRY_DELAY_MS = 3000;

export type BootstrapState = {
  /** 복원이 오래 걸리는 중 — 스플래시에 연결 중 안내 */
  slow: boolean;
  /** 재시도 예산을 다 썼다 — 스플래시에 다시 시도 버튼 */
  failed: boolean;
  retry: () => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 앱이 처음 뜰 때 한 번 도는 준비 작업. 끝나면 useAuthStore의 session이 loading에서 벗어나고,
// RootNavigator가 스플래시 대신 실제 화면 트리를 그린다.
// enabled가 false면(앱 접근 권한 안내를 아직 안 본 첫 실행) 기다린다 — 안내를 마친 뒤 스플래시가 뜨게 (SCRUM-184).
// 저장된 로그인이 있으면 서버가 "거절"할 때만 로그인 화면으로 보낸다. 서버에 닿지 못한 것은
// 로그아웃 사유가 아니라서 스플래시에서 기다리며 다시 시도한다 (SCRUM-209).
export function useAppBootstrap(enabled = true): BootstrapState {
  const status = useAuthStore((state) => state.session.status);
  const setSession = useAuthStore((state) => state.setSession);
  const startOnboarding = useAuthStore((state) => state.startOnboarding);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // 이미 확정된 뒤면 다시 돌리지 않는다 — 개발 중 fast refresh로 이 훅이 재실행돼도
    // 로그인해둔 세션이 초기화되지 않게 한다.
    if (!enabled || status !== "loading") {
      return;
    }

    let cancelled = false;
    setFailed(false);
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlow(true);
    }, SLOW_NOTICE_MS);

    const run = async () => {
      const startedAt = Date.now();
      // 세션 확정은 restoreSession이 아니라 여기서 한다 — 복원이 일찍 끝나도
      // 스플래시 최소 노출 시간 전에 화면이 바뀌지 않게 하기 위해서다.
      const [, first] = await Promise.all([sleep(MIN_SPLASH_DURATION_MS), restoreSession()]);
      let result = first;
      while (!cancelled && result.kind === "unreachable" && Date.now() - startedAt < RETRY_BUDGET_MS) {
        await sleep(RETRY_DELAY_MS);
        if (cancelled) return;
        result = await restoreSession();
      }
      if (cancelled) return;

      if (result.kind === "restored") {
        // 세션 복원 때 받은 /users/me 응답을 내 정보 캐시에 그대로 넣어 둔다 (SCRUM-309) —
        // 안 넣으면 마이페이지가 같은 주소를 다시 받는 동안 소속·권한 없이 일반 화면으로 먼저 그려진다.
        queryClient.setQueryData(["me"], result.user);
        // 프로필 설정을 마치기 전에 앱을 껐다 켜도 온보딩으로 돌아온다 (로그인 분기와 같은 기준).
        if (result.user.profileCompleted) {
          setSession(result.user, result.tokens);
        } else {
          startOnboarding(result.user, result.tokens);
        }
      } else if (result.kind === "signed-out") {
        clearSession();
      } else {
        // 끝내 서버에 닿지 못했다 — 로그인은 살아 있으니 로그인 화면 대신 다시 시도를 묻는다.
        setFailed(true);
      }
    };
    void run();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [enabled, status, attempt, setSession, startOnboarding, clearSession]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((value) => value + 1);
  }, []);

  return { slow, failed, retry };
}
