import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HomeBanner } from "@onnuri/shared";
import { useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useDeleteHomeBanner, useHomeBanners } from "./api";

// 마이페이지 관리자 메뉴 > 홈 배너 관리 (자체 디자인 — 시안 없음, 셀 관리 목록 결).
// 홈에는 목록의 맨 위(최신) 배너가 표시된다. 내리기 = 삭제 — 그러면 이전 배너가 다시 올라간다.
export function AdminBannerManageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: banners } = useHomeBanners();
  const deleteBanner = useDeleteHomeBanner();

  const [pendingDelete, setPendingDelete] = useState<HomeBanner | null>(null);
  const dialogRef = useRef<AppDialogRef>(null);

  const handleDeletePress = (banner: HomeBanner) => {
    setPendingDelete(banner);
    dialogRef.current?.open();
  };

  const confirmDelete = () => {
    dialogRef.current?.close();
    if (!pendingDelete) return;
    deleteBanner.mutate(pendingDelete.id, {
      onError: () => Alert.alert("삭제 실패", "잠시 후 다시 시도해주세요."),
    });
    setPendingDelete(null);
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="pb-10 pt-2">
        <Text className="px-5 py-2 text-body-small text-text-alternative">
          맨 위의 배너가 홈에 표시돼요. 배너를 삭제하면 이전 배너가 다시 올라와요.
        </Text>

        {(banners ?? []).map((banner, index) => (
          <View
            key={banner.id}
            className="mx-5 flex-row items-center justify-between border-b border-background-assistive py-3"
          >
            <View className="flex-1 flex-row items-center gap-3">
              {/* 포스터는 썸네일, 말씀 배너는 회색 자리에 책 아이콘 */}
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
                  {index === 0 && (
                    <Text className="text-caption-main text-primary-normal">홈에 표시 중</Text>
                  )}
                </View>
                <Text className="text-body-small text-text-alternative" numberOfLines={1}>
                  {banner.kind === "SERMON"
                    ? `말씀 배너 · ${banner.passage ?? ""}`
                    : "포스터 배너"}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => handleDeletePress(banner)} hitSlop={10}>
              <Text className="text-body-small text-semantic-danger">삭제</Text>
            </Pressable>
          </View>
        ))}

        {(banners ?? []).length === 0 && (
          <Text className="mt-8 text-center text-body-medium text-text-alternative">
            등록된 배너가 없어요{"\n"}지금은 기본 말씀 배너가 표시되고 있어요
          </Text>
        )}

        {/* 등록 — 셀 관리의 점선 행과 같은 패턴 */}
        <Pressable
          className="mx-5 mt-4 h-14 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-background-assistive"
          onPress={() => navigation.navigate("AdminBannerForm")}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Icon name="plus" size={16} color={colors.icon.normal} />
          <Text className="text-body-regular text-text-alternative">배너 등록</Text>
        </Pressable>
      </ScrollView>

      <AppDialog
        ref={dialogRef}
        title={`"${pendingDelete?.title ?? ""}" 배너를 내리시겠습니까?`}
        description="삭제하면 이전 배너가 다시 표시됩니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
      />
    </View>
  );
}
