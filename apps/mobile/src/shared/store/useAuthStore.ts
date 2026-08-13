import { create } from "zustand";

import type { User } from "@onnuri/shared";

// 세션은 필드 여러 개가 아니라 값 하나로 표현한다. accessToken이 null인 것만으로는
// "세션 없음"과 "아직 확인 전"을 구분할 수 없는데, 상태를 별도 필드로 두면 둘을 손으로 맞춰야 하고
// 한쪽만 바꾸는 실수가 조용히 통과한다. 유니온으로 묶으면 어긋난 조합 자체가 만들어지지 않고,
// user/accessToken은 authenticated 가지에서만 읽힌다 — 그 밖에서 접근하면 컴파일 에러다.
type Session =
  | { status: "loading" }
  | { status: "authenticated"; user: User; accessToken: string }
  | { status: "unauthenticated" };

interface AuthState {
  session: Session;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: { status: "loading" },
  setSession: (user, accessToken) =>
    set({ session: { status: "authenticated", user, accessToken } }),
  clearSession: () => set({ session: { status: "unauthenticated" } }),
}));
