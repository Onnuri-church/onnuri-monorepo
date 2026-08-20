import { Image, StyleSheet, Text, View } from "react-native";

// 시안 확정값 362x240. 폭은 배너가 정하지 않고 호출부의 좌우 여백이 정하므로 비율로만 고정한다.
const IMAGE_ASPECT_RATIO = 362 / 240;

interface SermonSeriesBannerProps {
  /** 시리즈 묶음 이름 (예: "8월 설교 시리즈") */
  seriesLabel: string;
  title: string;
  /** 본문 범위와 한 줄 소개 (예: "마태복음 5:1 - 7:29 · 산상수훈을 따라가는 8월") */
  description: string;
  /** 대표 이미지. 없으면 회색 자리만 그린다 — 시안도 아직 자리만 잡혀 있다. */
  imageUrl?: string;
}

// 주보 목록 맨 위에 오는 이번 달 설교 시리즈 배너. 대표 이미지 아래에 라벨·제목·소개가 쌓인다.
//
// 세 텍스트 사이에는 간격을 주지 않는다. 시안에서 벌어져 보이는 건 스타일마다 다른 행간
// (Caption/Main 16px, Body/Small 23px) 때문인데, tokens.js는 모든 텍스트 스타일을 140%로 고정하고
// 있어서 그대로는 재현되지 않는다 — 간격으로 흉내내면 행간 규칙과 이중으로 어긋나므로 두지 않았다.
export function SermonSeriesBanner({
  seriesLabel,
  title,
  description,
  imageUrl,
}: SermonSeriesBannerProps) {
  return (
    <View>
      <View
        className="overflow-hidden rounded-2.5 bg-text-assistive"
        style={{ aspectRatio: IMAGE_ASPECT_RATIO }}
      >
        {/* 퍼센트 사이즈는 부모 높이가 aspectRatio로 정해질 때 웹에서 어긋나 절대 채움으로 고정한다. */}
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
      </View>
      <View className="mt-5">
        <Text className="text-caption-main text-primary-normal">{seriesLabel}</Text>
        <Text className="text-body-small-bold text-text-normal">{title}</Text>
        <Text className="text-body-small text-text-alternative">{description}</Text>
      </View>
    </View>
  );
}
