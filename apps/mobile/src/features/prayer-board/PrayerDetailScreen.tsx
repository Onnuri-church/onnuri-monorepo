import { type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Avatar } from "../../shared/components/base/Avatar";
import { Header } from "../../shared/components/base/Header";
import { Icon } from "../../shared/components/base/Icon";
import { Skeleton } from "../../shared/components/base/Skeleton";
import { Thumbnail } from "../../shared/components/base/Thumbnail";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import { deletePrayer, fetchPrayerDetail } from "./api";
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, "PrayerBoardDetail">>().params;
  const toggleBookmark = useToggleBookmark();
  const queryClient = useQueryClient();
  const dialogRef = useRef<AppDialogRef>(null);
  const isAdmin = useMe()?.isAdmin === true;

  const { data, isPending, isError } = useQuery({
    queryKey: ["prayer", id],
    queryFn: () => fetchPrayerDetail(id),
  });

  // 수정은 작성자만, 삭제는 작성자와 관리자 (서버도 같은 규칙으로 막는다). 둘 다 못 하면 ⋮ 대신 북마크.
  const canEdit = data?.isMine === true;
  const canDelete = canEdit || (data !== undefined && isAdmin);

  const { mutate: remove } = useMutation({
    mutationFn: () => deletePrayer(id),
    onSuccess: () => {
      // 카테고리별로 캐시가 나뉘어 있어 지운 글이 다른 목록에 남지 않게 기도제목 쿼리를 전부 새로 받는다.
      void queryClient.invalidateQueries({ queryKey: ["prayers"] });
      queryClient.removeQueries({ queryKey: ["prayer", id] });
      navigation.goBack();
    },
    onError: () => Alert.alert(t("삭제 실패"), t("잠시 후 다시 시도해주세요.")),
  });

  // 헤더 우측 북마크에 동작을 붙이려면 화면에서 헤더를 다시 지정해야 한다 (PrayerMenu와 같은 이유).
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("기도제목")}
          rightAction={canDelete ? "more" : "bookmark"}
          menuItems={[
            ...(canEdit
              ? [
                  {
                    icon: "edit" as const,
                    label: t("수정하기"),
                    onPress: () => navigation.navigate("PrayerWrite", { id }),
                  },
                ]
              : []),
            {
              icon: "trash-can" as const,
              label: t("삭제하기"),
              onPress: () => dialogRef.current?.open(),
            },
          ]}
          bookmarked={data?.bookmarked}
          onPressBookmark={() => toggleBookmark(id, data?.bookmarked ?? false)}
        />
      ),
    });
  }, [navigation, id, data?.bookmarked, toggleBookmark, canEdit, canDelete, t]);

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          {t("기도제목을 불러오지 못했어요")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        className="flex-1 bg-background-normal"
        contentContainerClassName=""
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
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
              <CategoryBadge label={t(data.category)} />
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
                <Avatar imageUrl={data.authorAvatarUrl} size={36} />
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
                <Text
                  className="text-caption-main text-text-alternative"
                  style={{ lineHeight: 16 }}
                >
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

            {/* 첨부 사진 — 없으면 영역을 그리지 않는다. 시안은 각진 모서리라 기본 라운드를 끈다. */}
            {data.photoUrl !== null && (
              <Thumbnail
                source={{ uri: data.photoUrl }}
                ratio={PHOTO_RATIO}
                className="rounded-none"
                style={{ marginTop: GAP_BODY_TO_PHOTO }}
              />
            )}
          </>
        )}
      </ScrollView>

      <AppDialog
        ref={dialogRef}
        title={t("정말 삭제하시겠습니까?")}
        description={t("삭제된 데이터는 복구할 수 없습니다.")}
        confirmLabel={t("확인")}
        cancelLabel={t("취소")}
        onConfirm={() => {
          dialogRef.current?.close();
          remove();
        }}
      />
    </View>
  );
}
