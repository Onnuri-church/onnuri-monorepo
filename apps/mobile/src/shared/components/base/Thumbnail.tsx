import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface ThumbnailProps {
  source?: ImageSourcePropType;
  /** 가로/세로 비율. 큰 사진은 호출부가 넘기고, 기본값은 정사각에 가까운 시안 추정값이다. */
  ratio?: number;
  /** 사진 위 좌하단 설명 (예: "여름 수련회 찬양 · 7월"). */
  caption?: string;
  /** 남은 장수. 주면 사진을 어둡게 덮고 "+N"을 가운데 표시한다. */
  overlayCount?: number;
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

// 시안 추정값 — 확정 수치가 나오면 여기만 고친다.
const DEFAULT_RATIO = 6 / 5;

// 사진 한 장을 그리는 컴포넌트. 큰 사진과 작은 썸네일 모두 이걸 쓰고 비율만 바꾼다.
// 도메인을 모르고 사진·설명·남은 장수만 받는다.
export function Thumbnail({
  source,
  ratio = DEFAULT_RATIO,
  caption,
  overlayCount,
  onPress,
  className,
  style,
}: ThumbnailProps) {
  const content = (
    <>
      {source && (
        // 퍼센트 사이즈는 부모 높이가 aspectRatio로 정해질 때 웹에서 어긋나 절대 채움으로 고정한다.
        <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {caption && (
        <Text className="absolute bottom-3 left-3 text-label-small text-background-normal">
          {caption}
        </Text>
      )}
      {overlayCount !== undefined && (
        <>
          {/* 스크림과 글자를 형제로 둔다 — 자식으로 넣으면 opacity가 글자까지 흐리게 만든다. */}
          <View className="absolute inset-0 bg-background-dark opacity-50" />
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-body-main text-background-normal">+{overlayCount}</Text>
          </View>
        </>
      )}
    </>
  );

  const containerClassName = ["overflow-hidden rounded-2xl bg-text-assistive", className]
    .filter(Boolean)
    .join(" ");

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={containerClassName}
        style={[{ aspectRatio: ratio }, style]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View className={containerClassName} style={[{ aspectRatio: ratio }, style]}>
      {content}
    </View>
  );
}
