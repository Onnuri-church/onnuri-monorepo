import { Image, View } from "react-native";

interface AvatarProps {
  /** 프로필 사진 주소 — 없으면 회색 원 placeholder */
  imageUrl?: string | null;
  /** 지름(px). 쓰는 자리마다 시안 값이 36~42로 제각각이라 숫자로 받는다 */
  size: number;
  className?: string;
}

// 프로필 사진 원. 도메인을 모르고 주소와 크기만 받는다 — 사진이 없으면 기존 자리표시와
// 같은 회색 원을 그린다. 앱 곳곳의 "TODO(사진)" 회색 원이 이 컴포넌트로 통일된다.
export function Avatar({ imageUrl, size, className }: AvatarProps) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  return imageUrl ? (
    <Image source={{ uri: imageUrl }} style={style} className={className} />
  ) : (
    <View
      className={["bg-background-assistive", className].filter(Boolean).join(" ")}
      style={style}
    />
  );
}
