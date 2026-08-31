import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { VideoStatusBadges } from "./VideoStatusBadges";

// 시안 확정값: 카드 362x280 중 썸네일이 362x200. 카드 폭은 호출부의 좌우 여백이 정한다.
const THUMBNAIL_ASPECT_RATIO = 362 / 200;

export interface SermonVideo {
  /** YouTube videoId */
  id: string;
  title: string;
  /** 설교자. 영상 제목에서 뽑아내는데 제목에 아예 없는 회차가 있어 빈 문자열일 수 있다. */
  preacher: string;
  /** 표시용 날짜 문자열 (예: "2026.05.03") */
  date: string;
  /** 예배 이름 (예: "주일 4부 예배"). 상세 화면 제목으로 쓴다. */
  serviceName: string;
  /** 예배 일시 (예: "2026.08.09 (일) 오후 2:01"). 상세 화면에서 쓴다. */
  dateTimeLabel: string;
  thumbnailUrl?: string;
  /** 표시용 조회수 문자열 (예: "10K"). 없으면 배지를 그리지 않는다. */
  viewCount?: string;
  /** 지금 라이브 중인 영상 */
  isLive?: boolean;
}

interface SermonVideoCardProps {
  video: SermonVideo;
  onPress?: () => void;
}

// 말씀 게시판의 설교영상 카드. 썸네일 위에 상태 배지(LIVE·조회수)가 겹치고 아래에 제목과 설교자가 온다.
// 배지는 영상 상태를 아는 부분이라 카드가 직접 그린다.
export function SermonVideoCard({ video, onPress }: SermonVideoCardProps) {
  return (
    <Pressable
      className="overflow-hidden rounded-5 bg-background-normal shadow-card"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      <View className="bg-background-muted" style={{ aspectRatio: THUMBNAIL_ASPECT_RATIO }}>
        {/* 퍼센트 사이즈는 부모 높이가 aspectRatio로 정해질 때 웹에서 어긋나 절대 채움으로 고정한다. */}
        {video.thumbnailUrl && (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        <VideoStatusBadges
          className="absolute left-4 top-6"
          isLive={video.isLive}
          viewCount={video.viewCount}
        />
      </View>
      <View className="gap-1 px-4 pb-6 pt-3.5">
        <Text className="text-heading-small text-text-normal">{video.title}</Text>
        {/* 설교자가 없는 회차는 날짜만 남긴다 — 빈 문자열을 그냥 이어붙이면 앞에 공백이 뜬다. */}
        <Text className="text-caption-main text-text-alternative">
          {[video.preacher, video.date].filter(Boolean).join(" ")}
        </Text>
      </View>
    </Pressable>
  );
}
