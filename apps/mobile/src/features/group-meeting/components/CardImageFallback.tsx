import { View } from "react-native";

import { Logo } from "../../../shared/components/base/Logo";

// 배경사진이 없는 소그룹 카드의 기본 이미지 — 시안의 회색 사진 영역을 유지하고
// 가운데 OY 심볼을 워터마크처럼 연하게 둔다 (별도 에셋 없이 브랜드 톤 통일).
// 게시판·내 소그룹 두 그리드가 같이 쓴다.
export function CardImageFallback() {
  return (
    <View style={{ opacity: 0.2 }}>
      <Logo variant="symbol" width={56} />
    </View>
  );
}
