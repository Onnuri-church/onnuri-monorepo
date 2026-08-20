import { View } from "react-native";

import { ImagePager } from "../../shared/components/base/ImagePager";

// API 연동 전 임시 데이터. 주보와 짝을 이루는 그 주의 나눔지다.
const SHARING_SHEET_PAGES = [
  {
    id: "1",
    url: "https://i.namu.wiki/i/3T-vwDpi1dUnhvtTMcm_qeHDJkysOCHZNCeyILaMa4GJWdSC-E1bqU9wMUWVarFBIN9VSBx6TkDqvVmbHXP9EQ.webp",
  },
];

// 나눔지. 주보 상세와 화면이 같아서 ImagePager를 함께 쓰고, 여기서는 데이터만 고른다.
// 나눔지에만 붙는 것(본문·나눔 질문 등)이 생기면 이 파일에만 더하면 된다.
//
// route의 id는 아직 쓰지 않는다 — 임시 데이터라 조회할 대상이 없다.
export function SharingSheetScreen() {
  return (
    <View className="flex-1 bg-background-normal">
      <ImagePager className="mt-6" images={SHARING_SHEET_PAGES} />
    </View>
  );
}
