import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const KEY = "permission-guide-seen";

interface PermissionGuideState {
  /** null = 아직 저장소를 읽는 중 (스플래시 동안 끝난다) */
  seen: boolean | null;
  markSeen: () => void;
}

// 앱 접근 권한 안내(SCRUM-184)를 이 기기에서 이미 봤는지 — 처음 실행할 때 한 번만 보여준다.
// 테마 저장과 같은 이유로 SecureStore를 쓴다 (실패하면 다음 실행에 한 번 더 보일 뿐이다).
export const usePermissionGuideStore = create<PermissionGuideState>((set) => ({
  seen: null,
  markSeen: () => {
    set({ seen: true });
    SecureStore.setItemAsync(KEY, "1").catch(() => {});
  },
}));

// 앱 시작 때 한 번 — 저장된 값을 읽어 반영한다.
export async function restorePermissionGuide(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    usePermissionGuideStore.setState({ seen: saved === "1" });
  } catch {
    // 저장소가 없는 환경(웹 등) — 안내를 건너뛴다.
    usePermissionGuideStore.setState({ seen: true });
  }
}
