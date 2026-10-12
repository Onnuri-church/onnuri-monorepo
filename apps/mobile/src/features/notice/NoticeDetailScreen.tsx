import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLayoutEffect, useRef, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Header } from "../../shared/components/base/Header";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import { toNoticeDateLabel, useDeleteNotice, useNotice } from "./api";

// 공지 상세 — 공지 한 건을 직접 받는다 (목록은 쪽 단위라 캐시에 없을 수 있다).
// 관리자에게는 헤더 오른쪽 ⋮ 메뉴(수정하기·삭제하기)가 붙는다 — 목록의 ⋮와 같은 기능이다.
export function NoticeDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "NoticeDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: notice, isLoading } = useNotice(params.id);
  const isAdmin = useMe()?.isAdmin === true;
  const deleteNotice = useDeleteNotice();
  const deleteDialogRef = useRef<AppDialogRef>(null);

  // ⋮ 메뉴가 관리자 여부에 달려 있어 화면이 헤더를 직접 등록한다 (DESIGN.md 헤더 규칙).
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("공지사항")}
          rightAction={isAdmin ? "more" : "none"}
          menuItems={[
            {
              icon: "edit",
              label: t("수정하기"),
              onPress: () => navigation.navigate("NoticeWrite", { id: params.id }),
            },
            {
              icon: "trash-can",
              label: t("삭제하기"),
              onPress: () => deleteDialogRef.current?.open(),
            },
          ]}
        />
      ),
    });
  }, [navigation, isAdmin, params.id, t]);

  const confirmDelete = () => {
    deleteDialogRef.current?.close();
    deleteNotice.mutate(params.id, {
      onSuccess: () => navigation.goBack(),
      onError: () => Alert.alert(t("삭제 실패"), t("잠시 후 다시 시도해주세요.")),
    });
  };

  // 포스터 비율이 제각각이라 불러온 뒤 실제 크기에서 받아온다 (ImagePager와 같은 방식).
  const [imageRatio, setImageRatio] = useState<number | undefined>(undefined);

  if (!notice) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">
          {isLoading ? t("공지를 불러오고 있어요.") : t("공지를 찾을 수 없어요.")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="px-5 pt-6"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      <Text className="text-heading-medium text-text-normal">{notice.title}</Text>
      <Text className="mt-2 text-body-small text-text-alternative">
        {toNoticeDateLabel(notice.createdAt)}
      </Text>

      <View className="mt-4 h-px bg-background-assistive" />

      {notice.imageUrl !== null && (
        <Image
          source={{ uri: notice.imageUrl }}
          className="mt-5 w-full rounded-2.5"
          style={{ aspectRatio: imageRatio }}
          onLoad={(event) => {
            const { width, height } = event.nativeEvent.source;
            setImageRatio(width / height);
          }}
        />
      )}

      {notice.content !== null && (
        <Text className="mt-5 text-body-medium text-text-neutral">{notice.content}</Text>
      )}
    </ScrollView>

      <AppDialog
        ref={deleteDialogRef}
        title={t("\"{{title}}\" 공지를 삭제하시겠습니까?", { title: notice.title })}
        description={t("삭제된 공지는 복구할 수 없습니다.")}
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={confirmDelete}
      />
    </View>
  );
}
