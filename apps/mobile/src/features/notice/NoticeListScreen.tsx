import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NoticeInfo } from "@onnuri/shared";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import { toNoticeDateLabel, useDeleteNotice, useNotices } from "./api";

// 마이페이지 > 공지사항 (자체 디자인 — 시안 없음, 홈 배너 관리 목록과 같은 결).
// 열람은 누구나, 등록(점선 행)·삭제는 관리자에게만 보인다.
export function NoticeListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: notices, isLoading } = useNotices();
  const isAdmin = useMe()?.isAdmin === true;
  const deleteNotice = useDeleteNotice();

  const [pendingDelete, setPendingDelete] = useState<NoticeInfo | null>(null);
  const dialogRef = useRef<AppDialogRef>(null);

  const handleDeletePress = (notice: NoticeInfo) => {
    setPendingDelete(notice);
    dialogRef.current?.open();
  };

  const confirmDelete = () => {
    dialogRef.current?.close();
    if (!pendingDelete) return;
    deleteNotice.mutate(pendingDelete.id, {
      onError: () => Alert.alert(t("삭제 실패"), t("잠시 후 다시 시도해주세요.")),
    });
    setPendingDelete(null);
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="pb-10 pt-2">
        {(notices ?? []).map((notice) => (
          <Pressable
            key={notice.id}
            className="mx-5 flex-row items-center justify-between border-b border-background-assistive py-4"
            onPress={() => navigation.navigate("NoticeDetail", { id: notice.id })}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <View className="flex-1 pr-3">
              <Text className="text-body-main text-text-normal" numberOfLines={1}>
                {notice.title}
              </Text>
              <Text className="mt-1 text-body-small text-text-alternative">
                {toNoticeDateLabel(notice.createdAt)}
              </Text>
            </View>
            {isAdmin ? (
              <Pressable onPress={() => handleDeletePress(notice)} hitSlop={10}>
                <Text className="text-body-small text-semantic-danger">{t("삭제")}</Text>
              </Pressable>
            ) : (
              <Icon name="expand-right" size={16} color={colors.icon.normal} />
            )}
          </Pressable>
        ))}

        {!isLoading && (notices ?? []).length === 0 && (
          <Text className="mt-10 text-center text-body-medium text-text-alternative">
            {t("등록된 공지가 없어요")}
          </Text>
        )}

        {/* 등록 — 셀 관리·배너 관리의 점선 행과 같은 패턴 (관리자 전용) */}
        {isAdmin && (
          <Pressable
            className="mx-5 mt-4 h-14 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-background-assistive"
            onPress={() => navigation.navigate("NoticeWrite")}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Icon name="plus" size={16} color={colors.icon.normal} />
            <Text className="text-body-regular text-text-alternative">{t("공지 등록")}</Text>
          </Pressable>
        )}
      </ScrollView>

      <AppDialog
        ref={dialogRef}
        title={t("\"{{title}}\" 공지를 삭제하시겠습니까?", { title: pendingDelete?.title ?? "" })}
        description={t("삭제된 공지는 복구할 수 없습니다.")}
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={confirmDelete}
      />
    </View>
  );
}
