import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

// 시안 확정값 362x240. 폭은 배너가 정하지 않고 호출부의 좌우 여백이 정하므로 비율로만 고정한다
// (주보 SermonSeriesBanner와 같은 방식).
const IMAGE_ASPECT_RATIO = 362 / 240;

// 사진이 없을 때만 깔리는 그라데이션. 원래 사진이 들어갈 자리라 사진이 붙으면 사진이 대신한다.
// RN에는 CSS 그라데이션이 없어서 이미 설치된 react-native-svg로 그린다 —
// expo-linear-gradient를 새로 깔면 네이티브 모듈이라 OTA로 못 나간다.
// 시안 값: 180deg, 53.24%에서 흰색 20% → 100%에서 #111111 20%.
const SCRIM_ID = "weeklySermonScrim";
const SCRIM_START = "0.5324";
const SCRIM_OPACITY = 0.2;

interface WeeklySermonBannerProps {
  /** 시리즈 묶음 이름 (예: "8월 설교 시리즈") */
  seriesLabel: string;
  /** 본문 범위 (예: "마태복음 6:5-8") */
  passage: string;
  title: string;
  /** 대표 이미지. 없으면 회색 자리에 그라데이션만 그린다 — 백엔드가 붙기 전까지는 항상 이 상태다. */
  imageUrl?: string;
  /** 우하단 "주보 · 나눔자료" 버튼. */
  onPressShortcut?: () => void;
}

// 홈 맨 위 이번주 말씀 배너. 사진 위에 라벨·본문·제목이 얹히고 우하단에 바로가기 버튼이 붙는다.
// (주보의 SermonSeriesBanner는 사진 "아래"에 글이 쌓이는 다른 배너다.)
export function WeeklySermonBanner({
  seriesLabel,
  passage,
  title,
  imageUrl,
  onPressShortcut,
}: WeeklySermonBannerProps) {
  return (
    <View
      className="overflow-hidden rounded-2.5 bg-text-assistive"
      style={{ aspectRatio: IMAGE_ASPECT_RATIO }}
    >
      {/* 퍼센트 사이즈는 부모 높이가 aspectRatio로 정해질 때 웹에서 어긋나 절대 채움으로 고정한다. */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={SCRIM_ID} x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset={SCRIM_START}
                stopColor={colors.background.normal}
                stopOpacity={SCRIM_OPACITY}
              />
              <Stop offset="1" stopColor={colors.text.normal} stopOpacity={SCRIM_OPACITY} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${SCRIM_ID})`} />
        </Svg>
      )}

      {/* 시안은 라벨 → 본문 → 제목을 각각 23씩 벌리는데, 그 23은 텍스트 높이가 0으로 잡힌
          Figma export 기준이라 그대로 쓸 수 없다. 실제 행간(13px의 140% = 18.2)을 빼고 남는
          만큼만 여백으로 준다 — 라벨 아래 24, 본문 아래 4. */}
      <View className="absolute bottom-5 left-6">
        <Text className="text-body-small text-background-normal">{seriesLabel}</Text>
        <Text className="mt-6 text-body-small-bold text-background-normal">{passage}</Text>
        <Text className="mt-1 text-body-small-bold text-background-normal">{title}</Text>
      </View>

      {/* 시안의 opacity 0.85는 글자까지 흐려져서 빼고 불투명하게 그린다 (확인 완료).
          좌우 여백이 다른 건(12/10) 화살표 아이콘 안쪽 여백을 시안이 감안한 값이다. */}
      <Pressable
        className="absolute bottom-5.5 right-6 flex-row items-center rounded-5 bg-background-normal py-1.5 pl-3 pr-2.5 active:opacity-80"
        onPress={onPressShortcut}
      >
        <Text className="text-caption-small text-text-normal">주보 · 나눔자료</Text>
        <Icon name="expand-right" size={15} />
      </Pressable>
    </View>
  );
}
