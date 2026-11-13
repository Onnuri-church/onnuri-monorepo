import type { AppVersionPolicy } from "@onnuri/shared";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

import { apiClient } from "../../shared/api/client";

// 지금 설치된 앱의 버전 ("1.0.0") — app.json의 version과 같다.
export const CURRENT_APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/** "1.2.3" 비교 — a가 b보다 낮으면 음수. 형식이 이상한 자리는 0으로 본다. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const pb = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// 앱 시작 때 서버의 최소 지원 버전을 묻는다 (SCRUM-193). 서버에 닿지 못하면 막지 않는다 —
// 네트워크가 잠깐 끊긴 것 때문에 앱을 못 쓰게 되면 안 된다 (fail-open).
export function useUpdateRequired(): { required: boolean; policy: AppVersionPolicy | null } {
  const { data } = useQuery({
    queryKey: ["app-version-policy"],
    queryFn: () => apiClient.get<AppVersionPolicy>("/app/version").then((res) => res.data),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
  const required =
    !!data?.minVersion && compareVersions(CURRENT_APP_VERSION, data.minVersion) < 0;
  return { required, policy: data ?? null };
}
