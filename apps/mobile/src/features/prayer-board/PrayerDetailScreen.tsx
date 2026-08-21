import { type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import { ScrollView, Text, View } from "react-native";

import { Header } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { Thumbnail } from "../../shared/components/base/Thumbnail";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchPrayerDetail } from "./api";
import { CategoryBadge } from "./components/CategoryBadge";
import { useToggleBookmark } from "./useToggleBookmark";

// 시안 확정값(402pt 프레임). 세로 간격이 4px 스케일에 안 맞는 값들이라 클래스 대신 상수로 둔다 —
// 이 화면에서만 쓰는 리듬이라 전역 spacing 토큰으로 올리지 않았다.
// 헤더(103) 아래로: 22 → 카테고리 17 → 13 → 제목 26 → 17 → 프로필 41 → 15 → 구분선 → 33 → 본문 → 19 → 사진 360.
const CONTENT_PADDING = 20;
const GAP_HEADER_TO_CATEGORY = 22;
const GAP_CATEGORY_TO_TITLE = 13;
const GAP_TITLE_TO_PROFILE = 17;
const GAP_PROFILE_TO_DIVIDER = 15;
const GAP_DIVIDER_TO_BODY = 33;
const GAP_BODY_TO_PHOTO = 19;
// 사진 362x360 (시안 확정값). 폭이 넓은 기기에서도 비율이 유지되도록 높이 고정 대신 비율로 준다.
const PHOTO_RATIO = 362 / 360;
// 공용 TEXT_STYLE은 행간이 전부 140%인데 시안은 스타일마다 다르다 (PrayerCard와 같은 이유).
// 이름 18 + 날짜 23 = 프로필 줄 41로 시안과 맞는다.
const TITLE_LINE = 26;
const NAME_LINE = 18;
const DATE_LINE = 23;
const BODY_LINE = 23;

export function PrayerDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, "PrayerBoardDetail">>().params;
  const toggleBookmark = useToggleBookmark();

  const { data, isPending, isError } = useQuery({
    queryKey: ["prayer", id],
    queryFn: () => fetchPrayerDetail(id),
  });

  // 헤더 우측 북마크에 동작을 붙이려면 화면에서 헤더를 다시 지정해야 한다 (PrayerMenu와 같은 이유).
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title="기도제목"
          rightAction="bookmark"
          bookmarked={data?.bookmarked}
          onPressBookmark={() => toggleBookmark(id)}
        />
      ),
    });
  }, [navigation, id, data?.bookmarked, toggleBookmark]);

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">기도제목을 불러오지 못했어요</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="pb-10"
      style={{ paddingHorizontal: CONTENT_PADDING }}
    >
      {isPending || !data ? (
        <View className="gap-4" style={{ marginTop: GAP_HEADER_TO_CATEGORY }}>
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </View>
      ) : (
        <>
          <View style={{ marginTop: GAP_HEADER_TO_CATEGORY }}>
            <CategoryBadge label={data.category} />
          </View>

          <Text
            className="text-heading-medium text-text-normal"
            style={{ marginTop: GAP_CATEGORY_TO_TITLE, lineHeight: TITLE_LINE }}
          >
            {data.title}
          </Text>

          {/* 왼쪽 작성자, 오른쪽 조회수. 프로필 사진은 목업에 없어서 회색 원으로 자리만 잡는다. */}
          <View
            className="flex-row items-center justify-between"
            style={{ marginTop: GAP_TITLE_TO_PROFILE }}
          >
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-full bg-background-assistive" />
              <View>
                <Text
                  className="text-body-small text-text-normal"
                  style={{ lineHeight: NAME_LINE }}
                >
                  {data.authorName}
                </Text>
                <Text
                  className="text-body-small text-text-alternative"
                  style={{ lineHeight: DATE_LINE }}
                >
                  {data.periodLabel}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-px">
              <Icon name="view-light" size={24} color={colors.icon.normal} />
              <Text className="text-caption-main text-text-alternative" style={{ lineHeight: 16 }}>
                {data.viewCount}
              </Text>
            </View>
          </View>

          <View
            className="h-px bg-background-assistive"
            style={{ marginTop: GAP_PROFILE_TO_DIVIDER }}
          />

          <Text
            className="text-body-medium text-text-neutral"
            style={{ marginTop: GAP_DIVIDER_TO_BODY, lineHeight: BODY_LINE }}
          >
            {data.content}
          </Text>

          {/* 사진. 목업에 이미지가 없어 지금은 시안처럼 회색 자리만 잡힌다.
              시안은 각진 모서리라 Thumbnail의 기본 라운드를 끈다. */}
          <Thumbnail
            ratio={PHOTO_RATIO}
            className="rounded-none"
            style={{ marginTop: GAP_BODY_TO_PHOTO }}
          />
        </>
      )}
    </ScrollView>
  );
}
