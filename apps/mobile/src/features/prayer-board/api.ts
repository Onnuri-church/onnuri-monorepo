import type {
  CreatePrayerRequest,
  PrayerCategoryValue,
  PrayerDetailResponse,
  PrayerListItem,
  PrayerListResponse,
  UpdatePrayerRequest,
} from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";
import type { PrayerRequest } from "./components/PrayerCard";

// 서버는 enum 값·ISO 날짜만 내리고 표시 문구(카테고리 한글명·작성일·D-day)는 여기서 조립한다.
// 예외는 authorName — 익명/관리자 실명 노출 판단이 서버 권한이라 완성 문구로 내려온다.

export const PRAYER_CATEGORIES = [
  { value: "all", label: "전체" },
  { value: "personal", label: "개인 및 영성" },
  { value: "health", label: "건강 및 일상" },
  { value: "community", label: "관계 및 공동체" },
  { value: "intercession", label: "중보 및 섬김" },
  { value: "etc", label: "기타" },
] as const;

export type PrayerCategory = (typeof PRAYER_CATEGORIES)[number]["value"];

// 필터 키 ↔ 서버 enum. 라벨은 카드·작성 폼이 같이 쓴다.
const CATEGORY_TO_SERVER: Record<Exclude<PrayerCategory, "all">, PrayerCategoryValue> = {
  personal: "PERSONAL_SPIRITUAL",
  health: "HEALTH_DAILY",
  community: "RELATIONSHIP_COMMUNITY",
  intercession: "INTERCESSION_SERVICE",
  etc: "OTHER",
};

const CATEGORY_LABEL: Record<PrayerCategoryValue, string> = {
  PERSONAL_SPIRITUAL: "개인 및 영성",
  HEALTH_DAILY: "건강 및 일상",
  RELATIONSHIP_COMMUNITY: "관계 및 공동체",
  INTERCESSION_SERVICE: "중보 및 섬김",
  OTHER: "기타",
};

export function categoryLabelToValue(label: string | null): PrayerCategoryValue | null {
  const found = (Object.entries(CATEGORY_LABEL) as [PrayerCategoryValue, string][]).find(
    ([, itemLabel]) => itemLabel === label,
  );
  return found?.[0] ?? null;
}

function categoryQuery(category: PrayerCategory): string {
  return category === "all" ? "" : `?category=${CATEGORY_TO_SERVER[category]}`;
}

// "2026-08-03T…" → "2026.08.03"
function toDotDate(iso: string): string {
  return iso.slice(0, 10).replaceAll("-", ".");
}

// 공개기간 종료일까지 남은 날. 지난 글(내/저장한 목록에만 남는다)은 D-day를 떼서
// 카드가 그 자리를 그리지 않게 한다.
function toDdayLabel(visibleUntil: string): string | null {
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const end = new Date(visibleUntil).getTime();
  const days = Math.round((end - today) / 86_400_000);
  return days >= 0 ? `D-${days}` : null;
}

function toCard(item: PrayerListItem): PrayerRequest {
  return {
    id: item.id,
    number: item.number,
    authorName: item.authorName,
    category: CATEGORY_LABEL[item.category],
    title: item.title,
    createdAtLabel: `작성일 ${toDotDate(item.createdAt)}`,
    ddayLabel: toDdayLabel(item.visibleUntil),
    bookmarked: item.bookmarked,
  };
}

interface PrayerListResult {
  /** 화면 상단 문구에 쓰는 전체 등록 수 (필터와 무관한 총계) */
  totalCount: number;
  items: PrayerRequest[];
}

// 관리자 여부는 서버가 요청자 기준으로 판단한다 — 익명 글의 authorName이 "익명(실명)"으로 온다.
export async function fetchPrayers(category: PrayerCategory): Promise<PrayerListResult> {
  const { data } = await apiClient.get<PrayerListResponse>(
    `/posts/prayers${categoryQuery(category)}`,
  );
  return { totalCount: data.totalCount, items: data.items.map(toCard) };
}

export async function fetchMyPrayers(category: PrayerCategory): Promise<PrayerRequest[]> {
  const { data } = await apiClient.get<PrayerListItem[]>(
    `/posts/prayers/mine${categoryQuery(category)}`,
  );
  return data.map(toCard);
}

export async function fetchBookmarkedPrayers(
  category: PrayerCategory,
): Promise<PrayerRequest[]> {
  const { data } = await apiClient.get<PrayerListItem[]>(
    `/posts/prayers/bookmarked${categoryQuery(category)}`,
  );
  return data.map(toCard);
}

export interface PrayerDetail extends PrayerRequest {
  /** 작성자 프로필 사진 — 익명 글은 서버가 null로 내린다 */
  authorAvatarUrl: string | null;
  /** 기도 기간 (예: "2026.07.24 - 2026.08.04") — 작성일부터 공개 종료일까지 */
  periodLabel: string;
  viewCount: number;
  content: string;
  /** 상세 화면에 붙는 첨부 사진 (시안: 한 장 영역) */
  photoUrl: string | null;
  /** 수정 프리필용 */
  isAnonymous: boolean;
  visibleUntil: string;
  photoUrls: string[];
  isMine: boolean;
}

export async function fetchPrayerDetail(id: string): Promise<PrayerDetail> {
  const { data } = await apiClient.get<PrayerDetailResponse>(`/posts/prayers/${id}`);
  return {
    ...toCard(data),
    authorAvatarUrl: data.authorAvatarUrl,
    periodLabel: `${toDotDate(data.createdAt)} - ${toDotDate(data.visibleUntil)}`,
    viewCount: data.viewCount,
    content: data.content,
    photoUrl: data.photoUrls[0] ?? null,
    isAnonymous: data.isAnonymous,
    visibleUntil: data.visibleUntil,
    photoUrls: data.photoUrls,
    isMine: data.isMine,
  };
}

export async function createPrayer(body: CreatePrayerRequest): Promise<void> {
  await apiClient.post("/posts/prayers", body);
}

export async function updatePrayer(id: string, body: UpdatePrayerRequest): Promise<void> {
  await apiClient.patch(`/posts/prayers/${id}`, body);
}

export async function deletePrayer(id: string): Promise<void> {
  await apiClient.delete(`/posts/prayers/${id}`);
}

export async function toggleBookmark(id: string, bookmarked: boolean): Promise<void> {
  if (bookmarked) await apiClient.delete(`/posts/prayers/${id}/bookmarks`);
  else await apiClient.post(`/posts/prayers/${id}/bookmarks`);
}
