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

const MOCK_PRAYERS: (PrayerRequest & { category_key: PrayerCategory })[] = Array.from(
  { length: 5 },
  (_, index) => ({
    id: `p${index + 1}`,
    number: 128 - index,
    authorName: "익명",
    category: "건강 및 일상",
    category_key: "health" as PrayerCategory,
    title: "이번 달 수술 앞둔 아버지를 위해 기도해주세요.",
    createdAtLabel: "작성일 2026.08.03",
    ddayLabel: "D-2",
    bookmarked: index % 2 === 0,
  }),
);

export async function fetchPrayers(category: PrayerCategory): Promise<PrayerListResult> {
  const items =
    category === "all" ? MOCK_PRAYERS : MOCK_PRAYERS.filter((p) => p.category_key === category);
  return { totalCount: 128, items };
}
