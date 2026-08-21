import type { PrayerRequest } from "./components/PrayerCard";

// API 연동 전 임시 데이터. 서버를 따로 띄우지 않아도 화면을 확인할 수 있게 앱 안에서 돌려준다
// (취향 소그룹·부서활동과 같은 방식). 연동할 때 아래 함수 본문만 apiClient 호출로 바꾼다.

export const PRAYER_CATEGORIES = [
  { value: "all", label: "전체" },
  { value: "personal", label: "개인 및 영성" },
  { value: "health", label: "건강 및 일상" },
  { value: "community", label: "관계 및 공동체" },
  { value: "intercession", label: "중보 및 섬김" },
  { value: "etc", label: "기타" },
] as const;

export type PrayerCategory = (typeof PRAYER_CATEGORIES)[number]["value"];

interface PrayerListResult {
  /** 화면 상단 문구에 쓰는 전체 등록 수 (필터와 무관한 총계) */
  totalCount: number;
  items: PrayerRequest[];
}

const MOCK_PRAYERS: (PrayerRequest & { category_key: PrayerCategory; mine: boolean })[] =
  Array.from({ length: 5 }, (_, index) => ({
    id: `p${index + 1}`,
    number: 128 - index,
    authorName: "익명",
    category: "건강 및 일상",
    category_key: "health" as PrayerCategory,
    title: "이번 달 수술 앞둔 아버지를 위해 기도해주세요.",
    createdAtLabel: "작성일 2026.08.03",
    ddayLabel: "D-2",
    bookmarked: index % 2 === 0,
    // 내가 쓴 글인지. 서버가 붙으면 로그인 유저와 작성자를 비교해 서버가 내려준다.
    mine: index < 3,
  }));

// 삭제·북마크 상태. 서버가 없어서 목업 배열을 직접 고치는 대신 여기 모아두고 조회할 때 반영한다
// (앱을 새로고침하면 처음 상태로 돌아온다). 연동할 때 두 함수는 DELETE/POST 요청으로 바뀐다.
const deletedIds = new Set<string>();
const bookmarkedIds = new Set(
  MOCK_PRAYERS.filter((prayer) => prayer.bookmarked).map((prayer) => prayer.id),
);

export async function deletePrayer(id: string): Promise<void> {
  deletedIds.add(id);
}

export async function toggleBookmark(id: string): Promise<void> {
  if (bookmarkedIds.has(id)) bookmarkedIds.delete(id);
  else bookmarkedIds.add(id);
}

// 목업 배열의 bookmarked는 처음 상태일 뿐이라, 조회할 때마다 현재 값으로 덮어준다.
function withBookmark<T extends PrayerRequest>(prayer: T): T {
  return { ...prayer, bookmarked: bookmarkedIds.has(prayer.id) };
}

export async function fetchPrayers(category: PrayerCategory): Promise<PrayerListResult> {
  const items =
    category === "all" ? MOCK_PRAYERS : MOCK_PRAYERS.filter((p) => p.category_key === category);
  return { totalCount: 128, items: items.map(withBookmark) };
}

// 저장한 기도제목 = 내가 북마크한 것만. 지금은 목업 배열의 bookmarked 플래그로 거른다.
// 서버가 붙으면 북마크 여부는 유저별이라 목록 조회 자체를 별도 엔드포인트로 받게 된다.
export async function fetchBookmarkedPrayers(category: PrayerCategory): Promise<PrayerRequest[]> {
  const bookmarked = MOCK_PRAYERS.filter(
    (prayer) => bookmarkedIds.has(prayer.id) && !deletedIds.has(prayer.id),
  ).map(withBookmark);
  return category === "all"
    ? bookmarked
    : bookmarked.filter((prayer) => prayer.category_key === category);
}

// 내 기도제목 = 내가 쓴 것만. 북마크와 같은 이유로 지금은 목업 플래그로 거른다.
export async function fetchMyPrayers(category: PrayerCategory): Promise<PrayerRequest[]> {
  const mine = MOCK_PRAYERS.filter((prayer) => prayer.mine && !deletedIds.has(prayer.id)).map(
    withBookmark,
  );
  return category === "all" ? mine : mine.filter((prayer) => prayer.category_key === category);
}

export interface PrayerDetail extends PrayerRequest {
  /** 기도 기간 (예: "2026.07.24 - 2026.08.04") */
  periodLabel: string;
  viewCount: number;
  content: string;
  /** 첨부 사진. 지금은 목업에 이미지가 없어서 자리만 잡는다. */
  photoUrl?: string | null;
}

export async function fetchPrayerDetail(id: string): Promise<PrayerDetail> {
  const found = MOCK_PRAYERS.find((prayer) => prayer.id === id);
  if (!found) throw new Error(`기도제목을 찾을 수 없습니다: ${id}`);
  return {
    ...withBookmark(found),
    periodLabel: "2026.07.24 - 2026.08.04",
    viewCount: 24,
    content:
      "다음 주 수요일에 아버지께서 큰 수술을 받으십니다. 담당 선생님과 의료진에게 지혜를 주시고, 수술이 잘 마무리되어 회복까지 순조롭게 이어지도록 기도 부탁드려요. 가족 모두가 두려움 없이 이 시간을 잘 통과할 수 있게 함께 마음 모아주시면 감사하겠습니다.",
    photoUrl: null,
  };
}
