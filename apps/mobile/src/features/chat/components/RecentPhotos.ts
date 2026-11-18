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

export function useRecentPhotos(visible: boolean): RecentPhoto[] {
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);

  useEffect(() => {
    if (!visible || Platform.OS !== "ios") return;
    let cancelled = false;
    (async () => {
      try {
        const MediaLibrary =
          require("expo-media-library/legacy") as typeof import("expo-media-library/legacy");
        let permission = await MediaLibrary.getPermissionsAsync();
        if (permission.status === "undetermined") {
          permission = await MediaLibrary.requestPermissionsAsync();
        }
        if (!permission.granted) return;
        const page = await MediaLibrary.getAssetsAsync({
          first: RECENT_COUNT,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });
        // 아이폰 사진 주소(ph://)는 그대로 그리거나 올릴 수 없어서 기기 안 파일 주소로 바꾼다.
        // iCloud에만 있는 사진은 내려받지 않고 건너뛴다.
        const resolved = await Promise.all(
          page.assets.map(async (asset) => {
            const info = await MediaLibrary.getAssetInfoAsync(asset, {
              shouldDownloadFromNetwork: false,
            });
            return info.localUri ? { id: asset.id, uri: info.localUri } : null;
          }),
        );
        if (!cancelled) setPhotos(resolved.filter((item): item is RecentPhoto => item !== null));
      } catch {
        // 모듈이 없는 예전 앱이거나 사진첩을 못 읽으면 줄 없이 둔다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return photos;
}
