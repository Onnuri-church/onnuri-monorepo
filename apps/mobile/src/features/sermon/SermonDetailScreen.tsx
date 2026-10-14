import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../shared/components/base/Icon";
import { YouTubePlayer } from "../../shared/components/base/YouTubePlayer";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchSermon } from "./api";
import { VideoStatusBadges } from "./components/VideoStatusBadges";

// 시안 확정값 402x288. 16:9(1.78)보다 세로로 넉넉한데, 영상이 16:9로 들어오면 위아래에
// 검은 여백이 생기는 플레이어 영역이라 그렇다 — 그래서 배경이 Background/Dark다.
const VIDEO_ASPECT_RATIO = 402 / 288;
// 시안 Video_fill 42x42 안의 실제 원이 36이다.
const PLAY_ICON_SIZE = 36;

const LIVE_NOTICE =
  "지금 실시간으로 진행 중인 예배예요. 화면을 터치하면 재생돼요. 예배가 끝나면 이 영상은 말씀 게시판에 자동으로 등록돼요.";
const REPLAY_NOTICE = "지난 예배 다시보기예요. 언제든 편하게 시청하세요.";

// 설교영상 상세.
export function SermonDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "SermonDetail">>();
  const { data: video, isPending, isError } = useQuery({
    queryKey: ["sermon", params.id],
    queryFn: () => fetchSermon(params.id),
  });
  // 처음에는 썸네일만 보여주고, 터치하면 그 자리에 플레이어를 띄운다 (안내 문구 "화면을 터치하면 재생돼요").
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPending) {
    return (
      <View className="flex-1 bg-background-page">
        <View className="w-full bg-background-dark" style={{ aspectRatio: VIDEO_ASPECT_RATIO }} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-page">
        <Text className="text-body-medium text-text-alternative">
          {t("영상을 불러오지 못했어요")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-page"
      contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
    >
      {/* iOS(WKWebView)는 playsinline·자동재생 동작이 Android와 달라 두 플랫폼을 따로 확인해야 한다. */}
      <View className="w-full bg-background-dark" style={{ aspectRatio: VIDEO_ASPECT_RATIO }}>
        {isPlaying ? (
          <YouTubePlayer videoId={video.videoId} />
        ) : (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsPlaying(true)}>
            {video.thumbnailUrl && (
              <Image
                source={{ uri: video.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            )}
            <View className="absolute inset-0 items-center justify-center">
              <Icon name="play" size={PLAY_ICON_SIZE} color={colors.icon.disable} />
            </View>
            <VideoStatusBadges
              className="absolute left-4 top-4"
              isLive={video.isLive}
              viewCount={video.viewCount}
            />
          </Pressable>
        )}
      </View>

      {/* 시안: 영상 아래 37, 좌우 20, 세 덩이 사이 간격 15. */}
      <View className="gap-4 px-5 pt-9">
        <Text className="text-body-small-bold text-text-normal">{video.serviceName}</Text>
        <Text className="text-body-medium text-text-alternative">
          {[video.dateTimeLabel, video.preacher].filter(Boolean).join(" · ")}
        </Text>
        <Text className="text-body-medium text-text-normal">
          {t(video.isLive ? LIVE_NOTICE : REPLAY_NOTICE)}
        </Text>
      </View>
    </ScrollView>
  );
}
