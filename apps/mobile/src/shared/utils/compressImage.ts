import { Image } from "react-native";

// 올리기 전 사진 줄이기 (SCRUM-240) — 긴 변 1600px, JPEG 75%. 아이폰 원본(3~5MB)이 300KB 안팎이 돼서
// 업로드와 보기가 크게 빨라진다. GIF(움직이는 사진)와 이미 올라간 주소는 그대로 둔다.
// 크기 조절 모듈은 앱 1.1.0부터 들어 있어서, 혹시 없거나 실패하면 원본을 그대로 올린다.
const MAX_SIDE = 1600;
const QUALITY = 0.75;

function getSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
  );
}

export async function compressImage(uri: string): Promise<string> {
  if (uri.startsWith("http") || uri.toLowerCase().endsWith(".gif")) return uri;
  try {
    const { manipulateAsync, SaveFormat } =
      require("expo-image-manipulator") as typeof import("expo-image-manipulator");
    const { width, height } = await getSize(uri);
    const longSide = Math.max(width, height);
    const resize =
      longSide > MAX_SIDE
        ? [{ resize: width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE } }]
        : [];
    const result = await manipulateAsync(uri, resize, {
      compress: QUALITY,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}
