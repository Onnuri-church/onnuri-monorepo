import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";
import { CategoryBadge } from "./CategoryBadge";

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
  /** 카드 우상단 북마크. 내 기도제목 화면은 시안에 없어서 끌 수 있게 둔다. */
  showBookmark?: boolean;
  /** 수정 모드. 카드 아래에 구분선 + 수정/삭제 줄이 붙고 카드가 그만큼 높아진다. */
  editing?: boolean;
  /** 수정 모드에서 삭제만 보여준다 — 관리자 게시판은 남의 글이라 수정이 없다. */
  deleteOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

// 기도제목 카드. 번호·D-day·북마크 같은 기도제목 도메인을 알아서 base가 아니라 feature에 둔다
// (DESIGN.md 컴포넌트 배치 규칙). 다른 기능이 같은 카드를 필요로 하면 그때 composed로 올린다.
// 시안 확정값(402pt 프레임): 카드 362x106, 안쪽 여백 16, 라운드 20.
// 높이가 106으로 떨어지려면 안쪽 줄 높이도 시안대로여야 한다 — 번호줄 17 + 7 + 제목 23 + 10 + 날짜줄 16 = 73.
// 공용 TEXT_STYLE은 모든 스타일에 행간 140%를 쓰는데 시안은 스타일마다 다르므로(캡션 16, 본문 23),
// 이 카드에서만 줄 높이를 시안 값으로 지정한다. 토큰이 스타일별 행간을 갖게 되면 이 지정을 지운다.
const CARD_HEIGHT = 106;
const CAPTION_LINE = 16;
const TITLE_LINE = 23;
// 수정 모드 시안 확정값: 카드 145(= 106 + 구분선 1 + 액션 줄 38). 구분선은 안쪽 여백을 무시하고
// 카드 폭 전체(362)를 가로지른다 — 그래서 액션 영역만 -mx-4로 여백 밖으로 빼낸다.
const EDIT_CARD_HEIGHT = 145;
const ACTION_ROW_HEIGHT = 38;

export function PrayerCard({
  prayer,
  onPress,
  onToggleBookmark,
  showBookmark,
  editing,
  deleteOnly,
  onEdit,
  onDelete,
}: PrayerCardProps) {
  return (
    <Pressable
      className="rounded-5 border border-background-muted bg-background-normal p-4 active:opacity-80"
      style={{ height: editing ? EDIT_CARD_HEIGHT : CARD_HEIGHT }}
      onPress={onPress}
    >
      <View className="flex-row items-center gap-1.5">
        <Text
          className="text-caption-main text-text-alternative"
          style={{ lineHeight: CAPTION_LINE }}
        >
          No.{prayer.number} · {prayer.authorName}
        </Text>
        <CategoryBadge label={prayer.category} />
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
      {showBookmark && (
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
      )}

      {/* mt-auto로 카드 바닥에 붙인다. -mx-4/-mb-4는 카드 안쪽 여백을 되돌려
          구분선이 카드 폭 전체를 가로지르게 하려는 것이다. */}
      {editing && (
        <View className="-mx-4 -mb-4 mt-auto">
          <View className="h-px bg-background-assistive" />
          <View className="flex-row items-center gap-6 px-4" style={{ height: ACTION_ROW_HEIGHT }}>
            {!deleteOnly && (
              <Pressable
                className="flex-row items-center gap-1 active:opacity-60"
                onPress={onEdit}
                hitSlop={8}
              >
                <Icon name="edit" size={16} color={colors.icon.normal} />
                <Text
                  className="text-caption-main text-text-alternative"
                  style={{ lineHeight: CAPTION_LINE }}
                >
                  수정
                </Text>
              </Pressable>
            )}
            <Pressable
              className="flex-row items-center gap-1 active:opacity-60"
              onPress={onDelete}
              hitSlop={8}
            >
              <Icon name="trash-can" size={16} color={colors.semantic.danger} />
              <Text
                className="text-caption-main text-semantic-danger"
                style={{ lineHeight: CAPTION_LINE }}
              >
                삭제
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
}
