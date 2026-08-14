import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// 시안 기준 썸네일 영역 비율 (173x109). 카드 폭은 카드가 정하지 않고 호출부(그리드)가 정한다.
const IMAGE_ASPECT_RATIO = 173 / 109;

interface CardProps {
  /** 본문 영역. 카테고리·제목·날짜 등 도메인 내용은 호출부가 구성한다. */
  children: ReactNode;
  className?: string;
  /** 그리드가 계산한 폭 등, 클래스로 표현할 수 없는 값 지정용. */
  style?: StyleProp<ViewStyle>;
  /** 상단 썸네일. 없으면 본문만 렌더링된다. */
  imageSource?: ImageSourcePropType;
  /** 썸네일 좌상단에 겹쳐 놓을 요소(예: <Chip color="open" text="모집중" />). 자리만 잡아주고 모양은 관여하지 않는다. */
  badge?: ReactNode;
  /** 마감 등 비활성 표시 — 카드 전체를 흐리게 한다. */
  dimmed?: boolean;
  /** 주면 카드 전체가 눌린다 (상세 페이지 이동 등). */
  onPress?: () => void;
}

// 도메인을 모르는 카드 컨테이너 — 썸네일·배지·본문의 레이아웃과 표면 처리만 담당한다.
export function Card({
  children,
  className,
  style,
  imageSource,
  badge,
  dimmed,
  onPress,
}: CardProps) {
  const containerClassName = [
    "overflow-hidden rounded-2xl bg-background-normal shadow-card",
    dimmed && "opacity-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Container = onPress ? Pressable : View;

  return (
    <Container className={containerClassName} style={style} onPress={onPress}>
      {imageSource && (
        <View className="bg-text-assistive" style={{ aspectRatio: IMAGE_ASPECT_RATIO }}>
          {/* 퍼센트 사이즈(h-full)는 웹에서 부모 높이 계산에 따라 어긋날 수 있어 절대 채움으로 고정.
              cover는 비율을 유지한 채 사진 중앙을 기준으로 잘라낸다 (RN 기본 정렬이 중앙). */}
          <Image source={imageSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {badge && <View className="absolute left-3 top-3">{badge}</View>}
        </View>
      )}
      <View className="grow p-4">{children}</View>
    </Container>
  );
}
