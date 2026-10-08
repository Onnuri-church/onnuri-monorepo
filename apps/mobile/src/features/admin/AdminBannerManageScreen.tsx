import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeBanner } from "@onnuri/shared";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useDeleteHomeBanner, useHomeBanners, useSetHomeBannerActive } from "./api";

// 마이페이지 관리자 메뉴 > 홈 배너 관리 (자체 디자인 — 시안 없음, 셀 관리 목록 결).
// 홈에는 왼쪽 체크가 켜진 배너 1개만 표시된다 (하나를 켜면 나머지는 꺼진다). 전부 꺼져 있으면 기본
// 배너가 보인다. 새로 등록한 배너는 등록 즉시 켜진다.
export function AdminBannerManageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: banners } = useHomeBanners();
  const deleteBanner = useDeleteHomeBanner();
  const setActive = useSetHomeBannerActive();

  const [pendingDelete, setPendingDelete] = useState<HomeBanner | null>(null);
  const dialogRef = useRef<AppDialogRef>(null);

  const handleDeletePress = (banner: HomeBanner) => {
    setPendingDelete(banner);
    dialogRef.current?.open();
  };

  // 켜기는 홈에 바로 노출되므로 한 번 확인받는다. 끄기(내리기)는 바로 처리한다.
  const [pendingPublish, setPendingPublish] = useState<HomeBanner | null>(null);
  const publishDialogRef = useRef<AppDialogRef>(null);

  const changeActive = (bannerId: string, active: boolean) =>
    setActive.mutate(
      { bannerId, active },
      { onError: () => Alert.alert(t("변경 실패"), t("잠시 후 다시 시도해주세요.")) },
    );

  const handleTogglePress = (banner: HomeBanner) => {
    if (banner.isActive) {
      changeActive(banner.id, false);
      return;
    }
    setPendingPublish(banner);
    publishDialogRef.current?.open();
  };

  const confirmPublish = () => {
    publishDialogRef.current?.close();
    if (pendingPublish) changeActive(pendingPublish.id, true);
    setPendingPublish(null);
  };

  const confirmDelete = () => {
    dialogRef.current?.close();
    if (!pendingDelete) return;
    deleteBanner.mutate(pendingDelete.id, {
      onError: () => Alert.alert(t("삭제 실패"), t("잠시 후 다시 시도해주세요.")),
    });
    setPendingDelete(null);
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="pb-10 pt-2">
        <Text className="px-5 py-2 text-body-small text-text-alternative">
          {t("체크한 배너가 홈에 표시돼요. 하나를 체크하면 나머지는 꺼지고, 모두 끄면 기본 배너가 보여요.")}
        </Text>

        {(banners ?? []).map((banner) => (
          <View
            key={banner.id}
            className="mx-5 flex-row items-center justify-between border-b border-background-assistive py-3"
          >
            <View className="flex-1 flex-row items-center gap-3">
              {/* 홈 표시 체크 — 시안의 라디오 체크와 같은 모양 (켜짐: 초록 원 + 흰 체크) */}
              <Pressable
                onPress={() => handleTogglePress(banner)}
                hitSlop={8}
                disabled={setActive.isPending}
              >
                {banner.isActive ? (
                  <View className="h-5.5 w-5.5 items-center justify-center rounded-full bg-primary-normal">
                    <Text className="text-caption-small text-text-disable">✓</Text>
                  </View>
                ) : (
                  <View className="h-5 w-5 rounded-full border border-background-assistive bg-background-normal" />
                )}
              </Pressable>
              {/* 배경사진이 있으면 썸네일, 없으면 회색 자리에 책 아이콘 */}
              {banner.imageUrl !== null ? (
                <Image source={{ uri: banner.imageUrl }} className="h-12 w-12 rounded-lg" />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-lg bg-background-muted">
                  <Icon name="book-open-alt-light" size={20} color={colors.icon.normal} />
                </View>
              )}
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-body-main text-text-normal" numberOfLines={1}>
                    {banner.title}
                  </Text>
                  {banner.isActive && (
                    <Text className="text-caption-main text-primary-normal">{t("홈에 표시 중")}</Text>
                  )}
                </View>
                <Text className="text-body-small text-text-alternative" numberOfLines={1}>
                  {banner.passage ?? t("성경 구절 없음 — 수정에서 입력해주세요")}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => navigation.navigate("AdminBannerForm", { bannerId: banner.id })}
                hitSlop={10}
              >
                <Text className="text-body-small text-primary-normal">{t("수정")}</Text>
              </Pressable>
              <Pressable onPress={() => handleDeletePress(banner)} hitSlop={10}>
                <Text className="text-body-small text-semantic-danger">{t("삭제")}</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {(banners ?? []).length === 0 && (
          <Text className="mt-8 text-center text-body-medium text-text-alternative">
            {t("등록된 배너가 없어요\n지금은 기본 말씀 배너가 표시되고 있어요")}
          </Text>
        )}

        {/* 등록 — 셀 관리의 점선 행과 같은 패턴 */}
        <Pressable
          className="mx-5 mt-4 h-14 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-background-assistive"
          onPress={() => navigation.navigate("AdminBannerForm")}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Icon name="plus" size={16} color={colors.icon.normal} />
          <Text className="text-body-regular text-text-alternative">{t("배너 등록")}</Text>
        </Pressable>
      </ScrollView>

      <AppDialog
        ref={publishDialogRef}
        title={t('"{{title}}" 배너를 게시하시겠습니까?', { title: pendingPublish?.title ?? "" })}
        description={t("홈에 바로 표시되고, 지금 표시 중인 배너는 내려가요.")}
        confirmLabel={t("예")}
        cancelLabel={t("아니오")}
        onConfirm={confirmPublish}
      />
      <AppDialog
        ref={dialogRef}
        title={t('"{{title}}" 배너를 내리시겠습니까?', { title: pendingDelete?.title ?? "" })}
        description={
          pendingDelete?.isActive
            ? t("삭제하면 홈에는 기본 배너가 표시됩니다.")
            : t("삭제한 배너는 되돌릴 수 없습니다.")
        }
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={confirmDelete}
      />
    </View>
  );
}
