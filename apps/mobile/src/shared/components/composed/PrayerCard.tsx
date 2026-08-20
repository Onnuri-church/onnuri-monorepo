import { Pressable, Text, View } from "react-native";

import { Icon } from "../base/Icon";
import { colors } from "../../theme/tokens";

export interface PrayerRequest {
  id: string;
  /** 게시판에 붙는 번호 (예: 128 → "No.128") */
  number: number;
  /** 익명이면 "익명" — 표시 문구는 서버가 정한다 */
  authorName: string;
  category: string;
  title: string;
  /** 표시용 문자열 (예: "작성일 2026.08.03") */
  createdAtLabel: string;
  /** 남은 기간 (예: "D-2"). 없으면 표시하지 않는다 */
  ddayLabel?: string | null;
  bookmarked?: boolean;
}

interface PrayerCardProps {
  prayer: PrayerRequest;
  onPress?: () => void;
  onToggleBookmark?: () => void;
}

// 시안 확정값(402pt 프레임): 카드 362x106, 안쪽 여백 16, 라운드 20.
// 높이가 106으로 떨어지려면 안쪽 줄 높이도 시안대로여야 한다 — 번호줄 17 + 7 + 제목 23 + 10 + 날짜줄 16 = 73.
// 공용 TEXT_STYLE은 모든 스타일에 행간 140%를 쓰는데 시안은 스타일마다 다르므로(캡션 16, 본문 23),
// 이 카드에서만 줄 높이를 시안 값으로 지정한다. 토큰이 스타일별 행간을 갖게 되면 이 지정을 지운다.
const CARD_HEIGHT = 106;
const CAPTION_LINE = 16;
const TITLE_LINE = 23;
const BADGE_LINE = 13;

export function PrayerCard({ prayer, onPress, onToggleBookmark }: PrayerCardProps) {
  return (
    <Pressable
      className="rounded-5 border border-background-muted bg-background-normal p-4 active:opacity-80"
      style={{ height: CARD_HEIGHT }}
      onPress={onPress}
    >
      <View className="flex-row items-center gap-1.5">
        <Text
          className="text-caption-main text-text-alternative"
          style={{ lineHeight: CAPTION_LINE }}
        >
          No.{prayer.number} · {prayer.authorName}
        </Text>
        {/* 배지를 base/Chip으로 쓰지 않는 이유: Chip은 글자가 12px이라 높이가 21이 되어
            시안의 17을 넘긴다. 카드 높이 106이 그만큼 밀린다. */}
        <View className="rounded-full bg-background-alternative px-2 py-0.5">
          <Text
            className="text-caption-small text-primary-normal"
            style={{ lineHeight: BADGE_LINE }}
          >
            {prayer.category}
          </Text>
        </View>
      </View>

      <Text
        className="mt-1.75 text-body-main text-text-normal"
        style={{ lineHeight: TITLE_LINE }}
        numberOfLines={1}
      >
        {prayer.title}
      </Text>

      <View className="mt-2.5 flex-row items-center gap-2.5">
        <Text
          className="text-caption-main text-text-alternative"
          style={{ lineHeight: CAPTION_LINE }}
        >
          {prayer.createdAtLabel}
        </Text>
        {prayer.ddayLabel && (
          <Text
            className="text-caption-main text-semantic-danger"
            style={{ lineHeight: CAPTION_LINE }}
          >
            {prayer.ddayLabel}
          </Text>
        )}
      </View>

      {/* 북마크는 카드 우상단에 겹친다 — 카드 전체 탭(상세 이동)과 동작이 달라 별도 Pressable이다.
          절대 위치 기준이 테두리 안쪽이라, 카드 끝에서 상 10·우 14가 되도록 9·13을 준다. */}
      <Pressable
        className="absolute right-3.25 top-2.25 active:opacity-60"
        onPress={onToggleBookmark}
        hitSlop={8}
      >
        <Icon
          name={prayer.bookmarked ? "bookmark-active" : "bookmark"}
          size={24}
          color={prayer.bookmarked ? colors.primary.normal : colors.text.alternative}
        />
      </Pressable>
    </Pressable>
  );
}
