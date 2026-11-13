import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppToast, type AppToastRef } from "../../shared/components/base/AppToast";
import { Avatar } from "../../shared/components/base/Avatar";
import { PressableScale } from "../../shared/components/base/PressableScale";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import { useBlockedUsers, useUnblockUser } from "./api";

// 설정 > 차단 목록 (SCRUM-198). 차단을 풀면 그 사람의 글·댓글·채팅이 다시 보인다.
export function BlockedUsersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const toastRef = useRef<AppToastRef>(null);
  const { data: users, isPending } = useBlockedUsers();
  const { mutate: unblock, isPending: unblocking, variables: unblockingId } = useUnblockUser();

  return (
    <ScrollView
      className="bg-background-normal"
      contentContainerClassName="px-5 pt-8"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      {isPending ? (
        <ActivityIndicator color={themeColors.primary.normal} />
      ) : !users || users.length === 0 ? (
        <Text className="pt-10 text-center text-body-medium text-text-alternative">
          {t("차단한 사람이 없어요.")}
        </Text>
      ) : (
        <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
          {users.map((user) => (
            <View key={user.userId} className="flex-row items-center gap-3">
              <Avatar imageUrl={user.avatarUrl} size={40} />
              <Text className="flex-1 text-body-main text-text-normal">{user.name}</Text>
              <PressableScale
                scaleTo={0.95}
                disabled={unblocking}
                className="rounded-full border border-background-assistive px-3 py-1.5"
                onPress={() =>
                  unblock(user.userId, {
                    onSuccess: () => toastRef.current?.show(t("차단을 풀었어요")),
                    onError: () => toastRef.current?.show(t("풀지 못했어요. 다시 시도해주세요")),
                  })
                }
              >
                {unblocking && unblockingId === user.userId ? (
                  <ActivityIndicator size="small" color={themeColors.primary.normal} />
                ) : (
                  <Text className="text-body-small text-text-neutral">{t("차단 해제")}</Text>
                )}
              </PressableScale>
            </View>
          ))}
        </View>
      )}
      <AppToast ref={toastRef} />
    </ScrollView>
  );
}
