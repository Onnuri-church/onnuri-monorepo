import { View } from "react-native";

import { ImagePager } from "../../shared/components/base/ImagePager";

// API 연동 전 임시 데이터. 주보 한 건이 이미지 여러 장으로 이뤄진다.
const BULLETIN_PAGES = [
  {
    id: "1",
    url: "https://i.namu.wiki/i/3T-vwDpi1dUnhvtTMcm_qeHDJkysOCHZNCeyILaMa4GJWdSC-E1bqU9wMUWVarFBIN9VSBx6TkDqvVmbHXP9EQ.webp",
  },
  {
    id: "2",
    url: "https://i.namu.wiki/i/3T-vwDpi1dUnhvtTMcm_qeHDJkysOCHZNCeyILaMa4GJWdSC-E1bqU9wMUWVarFBIN9VSBx6TkDqvVmbHXP9EQ.webp",
  },
];

// 주보 상세. 이미지만 넘겨서 보므로 화면은 데이터만 고르고 나머지는 ImagePager가 한다
// (나눔지 화면 SharingSheetScreen과 같은 구조다).
//
// route의 id는 아직 쓰지 않는다 — 임시 데이터라 조회할 대상이 없다 (QtBoardDetailScreen과 같은 상태).
export function BulletinDetailScreen() {
  return (
    <View className="flex-1 bg-background-normal">
      <ImagePager className="mt-6" images={BULLETIN_PAGES} />
    </View>
  );
}
