import { dehydrate, hydrate, type Query } from "@tanstack/react-query";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";

import { queryClient } from "./queryClient";

// 목록 캐시를 기기에 저장해 두었다가 앱을 다시 켤 때 먼저 보여준다 —
// 첫 화면에서 회색 스켈레톤 대신 지난번 게시물이 바로 뜨고, 최신 데이터는 뒤에서 다시 받아온다.
//
// 저장 대상은 공개 성격의 목록만 허용 목록으로 고른다. 기도제목·큐티·팔로워 노트·관리자·
// 내 정보·알림·채팅처럼 개인적이거나 민감한 데이터는 기기에 남기지 않는다.
const PERSISTED_ROOT_KEYS = new Set([
  "group-meetings",
  "team-activities",
  "notices",
  "home-posts",
  "bulletins",
  "banner",
  "sermons",
]);

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 일주일 지난 캐시는 버린다
const SAVE_THROTTLE_MS = 1000;
// 앱 버전이 바뀌면 응답 모양이 달라졌을 수 있으니 이전 캐시를 쓰지 않는다
const BUSTER = Constants.expoConfig?.version ?? "0";

type PersistedCache = {
  buster: string;
  savedAt: number;
  state: ReturnType<typeof dehydrate>;
};

function cacheFile(): File {
  return new File(Paths.document, "query-cache.json");
}

function isPersistedKey(queryKey: readonly unknown[]): boolean {
  const [root, sub] = queryKey;
  if (typeof root !== "string" || !PERSISTED_ROOT_KEYS.has(root)) return false;
  // 소그룹 상세에는 참여자 정보가 들어 있어 목록만 저장한다
  if (root === "group-meetings") return sub === "list";
  return true;
}

function shouldPersist(query: Query): boolean {
  return query.state.status === "success" && isPersistedKey(query.queryKey);
}

/** 저장된 캐시를 queryClient에 채운다. 실패해도 앱은 평소처럼 서버에서 받아온다. */
export async function restoreQueryCache(): Promise<void> {
  try {
    const file = cacheFile();
    if (!file.exists) return;
    const saved = JSON.parse(await file.text()) as PersistedCache;
    if (saved.buster !== BUSTER || Date.now() - saved.savedAt > MAX_AGE_MS) {
      file.delete();
      return;
    }
    hydrate(queryClient, saved.state);
  } catch {
    // 손상된 캐시 — 무시하고 새로 받는다
  }
}

function saveNow(): void {
  try {
    const payload: PersistedCache = {
      buster: BUSTER,
      savedAt: Date.now(),
      state: dehydrate(queryClient, { shouldDehydrateQuery: shouldPersist }),
    };
    const file = cacheFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(payload));
  } catch {
    // 저장 실패는 다음 변경 때 다시 시도된다
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

/** 캐시가 바뀔 때마다(최대 1초에 한 번) 기기에 저장한다. */
export function startQueryCachePersistence(): () => void {
  unsubscribe?.();
  const stop = queryClient.getQueryCache().subscribe((event) => {
    if (!isPersistedKey(event.query.queryKey)) return;
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveNow();
    }, SAVE_THROTTLE_MS);
  });
  unsubscribe = stop;
  return () => {
    stop();
    if (unsubscribe === stop) unsubscribe = null;
  };
}

/** 로그아웃·탈퇴 시 기기에 남은 캐시를 지운다 — 다음 계정에 이전 계정 화면이 보이지 않게. */
export function clearPersistedQueryCache(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    const file = cacheFile();
    if (file.exists) file.delete();
  } catch {
    // 최선 노력
  }
}
