import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { Logo } from "./Logo";

interface AvatarProps {
  /** 프로필 사진 주소 — 없으면 기본 이미지(회색 원 + OY 심볼 워터마크) */
  imageUrl?: string | null;
  /** 지름(px). 쓰는 자리마다 시안 값이 36~42로 제각각이라 숫자로 받는다 */
  size: number;
  className?: string;
}

// 프로필 사진 원. 도메인을 모르고 주소와 크기만 받는다 — 사진이 없으면 기본 이미지로
// 회색 원 가운데 OY 심볼을 연하게 둔다 (소그룹 카드의 CardImageFallback과 같은 톤,
// 2026-10-06 확정). 앱 곳곳의 "TODO(사진)" 회색 원이 이 컴포넌트로 통일된다.
// 카카오는 프로필 사진 주소를 http://로 준다 — iOS·안드로이드 모두 암호화 안 된 주소는 막아서
// 사진이 빈칸으로 뜬다. 같은 주소를 https로도 주므로 앞부분만 바꿔 쓴다 (SCRUM-278).
function toSecureUrl(url: string): string {
  return url.startsWith("http://") ? `https://${url.slice("http://".length)}` : url;
}

export function Avatar({ imageUrl, size, className }: AvatarProps) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  // 주소는 있는데 못 불러온 사진(지워진 파일, 막힌 주소)은 기본 이미지로 바꾼다 — 빈 원으로 두지 않는다.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);
  return imageUrl && !failed ? (
    // 클리핑은 바깥 View가, 채움은 absoluteFill + cover가 맡는다 (Card 썸네일과 같은 패턴).
    // 여백 많은 원본(흰 배경 스크린샷 등)은 원이 이미지의 배경색으로 차 보일 수 있는데,
    // 그건 원본이 그런 것이지 클리핑 문제가 아니다 (2026-10-06 확인).
    <View className={["overflow-hidden", className].filter(Boolean).join(" ")} style={style}>
      <Image
        source={{ uri: toSecureUrl(imageUrl) }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  ) : (
    <View
      className={["items-center justify-center overflow-hidden bg-background-assistive", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <View style={{ opacity: 0.2 }}>
        <Logo variant="symbol" width={size * 0.55} />
      </View>
    </View>
  );
}
