import { apiClient } from "./client";

// 확장자 → mimetype. RN의 FormData 파일 파트는 type이 없으면 서버에서 형식 검증에 걸린다.
const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
};

/**
 * 포토 피커가 준 로컬 사진(file://…)을 POST /uploads로 올리고 공개 주소를 돌려받는다.
 * 화면들은 이 주소를 각 도메인 API(셀 커버·소식 사진·갤러리·소그룹 배경)에 그대로 넘긴다.
 * 이미 http(s) 주소면(기존 저장값) 다시 올리지 않고 그대로 돌려준다 — 편집 화면에서
 * 사진을 안 바꾼 채 저장하는 경우다.
 */
export async function uploadImage(uri: string): Promise<string> {
  if (uri.startsWith("http")) return uri;

  const name = uri.split("/").pop() ?? "photo.jpg";
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "jpg";
  const form = new FormData();
  // RN의 FormData는 {uri, name, type} 오브젝트를 파일로 보낸다 — 웹 Blob 타입과 달라 캐스팅.
  form.append("file", {
    uri,
    name,
    type: MIME_TYPES[extension] ?? "image/jpeg",
  } as unknown as Blob);

  const response = await apiClient.post<{ url: string }>("/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.url;
}
