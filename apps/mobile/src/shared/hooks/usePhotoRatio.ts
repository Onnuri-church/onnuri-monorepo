import { useEffect, useState } from "react";
import { Image } from "react-native";

// 글 상세의 사진 칸이 쓸 가로세로 비율 (SCRUM-306·312). 사진의 실제 비율을 읽어 돌려주되,
// 너무 길쭉한 사진이 화면을 다 차지하지 않게 3:4(세로)~16:9(가로) 사이로만 둔다.
//
// 앱 전체 원칙: 올릴 때는 자르지 않고, 목록·격자·말풍선은 칸에 맞춰 자르고(cover), 글 상세는 이 비율의
// 칸에 사진을 자르지 않고 넣고(contain), 눌러서 크게 볼 때는 원본 그대로 보여준다. 글 상세를
// 정사각형으로 자르면 세로 사진의 위아래(인물의 머리·발)가 잘린다.
//
// 사진을 여러 장 넘겨 보는 칸은 첫 사진의 주소를 넘긴다 — 넘길 때마다 칸 높이가 바뀌지 않게 한다.
// 크기를 읽기 전과 읽지 못했을 때는 1(정사각형)이다.
export const PHOTO_MIN_RATIO = 3 / 4;
export const PHOTO_MAX_RATIO = 16 / 9;

export function usePhotoRatio(url: string | null | undefined): number {
  const [ratio, setRatio] = useState(1);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    Image.getSize(
      url,
      (width, height) => {
        if (!alive || width <= 0 || height <= 0) return;
        setRatio(Math.min(Math.max(width / height, PHOTO_MIN_RATIO), PHOTO_MAX_RATIO));
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return ratio;
}
