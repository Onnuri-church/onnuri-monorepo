import { useEffect, useState } from "react";
import { Platform } from "react-native";

// + 시트의 "최근 사진" 줄 데이터 (SCRUM-241) — 아이폰에서만. 안드로이드는 구글 플레이 정책상
// 사진첩 전체 읽기 권한을 쓰지 않고 기본 사진 선택창만 쓴다 (app.json blockedPermissions).
// 권한을 처음 열 때 한 번 묻고, 거절하면 줄을 숨긴다 (카메라 칸만 남는다).
const RECENT_COUNT = 30;

export interface RecentPhoto {
  id: string;
  /** 화면에 그리고 올릴 수 있는 file:// 주소 */
  uri: string;
}

// 마지막으로 읽은 결과 — 패널을 다시 열면 기다림 없이 바로 그린다 (SCRUM-243).
let cached: RecentPhoto[] = [];
let loading: Promise<RecentPhoto[]> | null = null;
// 화면에 먼저 보이는 몇 장부터 주소를 풀고, 나머지는 그다음에 푼다.
const FIRST_BATCH = 8;

async function load(
  askPermission: boolean,
  onPartial?: (photos: RecentPhoto[]) => void,
): Promise<RecentPhoto[]> {
  const MediaLibrary =
    require("expo-media-library/legacy") as typeof import("expo-media-library/legacy");
  let permission = await MediaLibrary.getPermissionsAsync();
  if (permission.status === "undetermined" && askPermission) {
    permission = await MediaLibrary.requestPermissionsAsync();
  }
  if (!permission.granted) return cached;
  const page = await MediaLibrary.getAssetsAsync({
    first: RECENT_COUNT,
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
  });
  // 아이폰 사진 주소(ph://)는 그대로 그리거나 올릴 수 없어서 기기 안 파일 주소로 바꾼다.
  // iCloud에만 있는 사진은 내려받지 않고 건너뛴다.
  const resolve = async (assets: typeof page.assets) =>
    (
      await Promise.all(
        assets.map(async (asset) => {
          const info = await MediaLibrary.getAssetInfoAsync(asset, {
            shouldDownloadFromNetwork: false,
          });
          return info.localUri ? { id: asset.id, uri: info.localUri } : null;
        }),
      )
    ).filter((item): item is RecentPhoto => item !== null);
  const first = await resolve(page.assets.slice(0, FIRST_BATCH));
  if (cached.length === 0) onPartial?.(first);
  const rest = await resolve(page.assets.slice(FIRST_BATCH));
  cached = [...first, ...rest];
  return cached;
}

function loadOnce(askPermission: boolean, onPartial?: (photos: RecentPhoto[]) => void) {
  if (!loading) {
    loading = load(askPermission, onPartial)
      .catch(() => cached) // 모듈이 없는 예전 앱이거나 사진첩을 못 읽으면 줄 없이 둔다.
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

// 채팅방에 들어올 때 미리 읽어 둔다 — 이미 허용한 경우에만 (여기서는 권한을 묻지 않는다).
export function preloadRecentPhotos() {
  if (Platform.OS !== "ios") return;
  void loadOnce(false);
}

export function useRecentPhotos(visible: boolean): RecentPhoto[] {
  const [photos, setPhotos] = useState<RecentPhoto[]>(cached);

  useEffect(() => {
    if (!visible || Platform.OS !== "ios") return;
    let cancelled = false;
    // 패널이 올라오는 동안에는 사진첩을 건드리지 않는다 — 같이 하면 올라오는 움직임이 끊긴다.
    const timer = setTimeout(() => {
      void loadOnce(true, (partial) => {
        if (!cancelled) setPhotos(partial);
      }).then((result) => {
        if (!cancelled) setPhotos(result);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible]);

  return photos;
}
