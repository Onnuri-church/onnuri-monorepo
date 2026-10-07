import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiClient } from "../../shared/api/client";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { AppToast, type AppToastRef } from "../../shared/components/base/AppToast";
import { Icon } from "../../shared/components/base/Icon";
import { Toggle } from "../../shared/components/base/Toggle";
import { signOut } from "../../shared/api/session";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useNotificationSettings, useUpdateNotificationSettings } from "./api";
import { BrightnessSlider } from "./components/BrightnessSlider";
import { SettingRow } from "./components/SettingRow";

// 알림 종류별 켜짐 여부 — 서버에 저장되고, 끄면 그 종류의 푸시가 오지 않는다
// (알림센터에는 그대로 쌓인다). key는 NotificationSettings 필드명과 같다.
const NOTIFICATION_ROWS = [
  { key: "sermonUpload", title: "말씀영상 업로드 알림" },
  { key: "liveWorship", title: "실시간 예배 시작 알림" },
  { key: "qtNewPost", title: "큐티나눔 새글 알림" },
] as const;

type NotificationKey = (typeof NOTIFICATION_ROWS)[number]["key"];

// 섹션 제목 시안 스타일(14px/600)과 버전정보(14px/400 #555555)는 등록된 텍스트 스타일·토큰에
// 없다 — caption-main(13/500)·body-small(13/400)+text.neutral로 근사했고, 등록 여부는
// 디자인(남현지) 확인 필요.
function SectionLabel({ children }: { children: string }) {
  return <Text className="text-caption-main text-text-alternative">{children}</Text>;
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 서버 값이 오기 전에는 기본값(전부 켜짐)으로 그린다 — 기본값과 같아서 깜빡임이 없다.
  const { data: settings } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const notifications: Record<NotificationKey, boolean> = settings ?? {
    sermonUpload: true,
    liveWorship: true,
    qtNewPost: true,
  };

  // 저장 피드백은 토스트 한 줄 — 확인 팝업은 조작을 끊어서 두지 않는다 (2026-10-02 결정,
  // 광고성 푸시가 생기면 그때 법정 고지 팝업을 별도로 단다).
  const toastRef = useRef<AppToastRef>(null);

  // 게스트도 설정에 들어올 수 있는데 계정이 필요한 행은 서버가 401로 거절한다 —
  // 실패 토스트/Alert 대신 로그인 안내부터 (기도제목 북마크와 같은 패턴).
  const requireLogin = () => {
    const { session } = useAuthStore.getState();
    if (session.status === "authenticated") return true;
    Alert.alert("로그인이 필요해요", "로그인 후 이용할 수 있어요.");
    return false;
  };

  const handleNotificationChange = (key: NotificationKey, value: boolean) => {
    if (!requireLogin()) return;
    const title = NOTIFICATION_ROWS.find((row) => row.key === key)?.title ?? "알림";
    toastRef.current?.show(`${title}이 ${value ? "켜졌어요" : "꺼졌어요"}`);
    updateSettings.mutate(
      { [key]: value },
      {
        // 훅의 onError가 토글을 서버 값으로 되돌린다 — 여기서는 안내만 띄운다.
        onError: () => toastRef.current?.show("저장하지 못했어요. 다시 시도해주세요"),
      },
    );
  };

  const handleLogoutPress = () => {
    // 화면 전환 + 토큰·푸시·계정별 캐시 정리까지 — clearSession만 부르면 저장된 토큰이
    // 남아 앱 재시작 시 도로 로그인되고, 이 기기로 푸시도 계속 온다.
    void signOut();
  };

  // 회원탈퇴 — 확인 팝업을 거쳐 서버에 탈퇴(soft)를 보내고, 성공하면 세션을 지워
  // 로그인 화면으로 돌아간다. 서버가 세션·푸시 토큰까지 지우므로 여기서는 로컬만 정리한다.
  const withdrawDialogRef = useRef<AppDialogRef>(null);
  const { mutate: withdraw, isPending: withdrawing } = useMutation({
    mutationFn: () => apiClient.delete("/users/me"),
    // 서버가 세션·푸시 토큰을 지웠어도 로컬 토큰·캐시는 남는다 — signOut으로 마저 정리.
    onSuccess: () => void signOut(),
    onError: () => Alert.alert("탈퇴하지 못했어요", "잠시 후 다시 시도해주세요."),
  });

  const handleWithdrawConfirm = () => {
    withdrawDialogRef.current?.close();
    if (!withdrawing) withdraw();
  };

  return (
    <ScrollView
      className="bg-background-normal"
      contentContainerClassName="px-5 pt-14"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      <View className="gap-7.5">
        {/* 디스플레이 — 다크모드 토글과 언어 섹션은 실동작(테마 연동·i18n)이 보류 중이라
            출시 전까지 숨긴다 (2026-10-06 결정, 켜도 변화 없는 토글은 버그로 보인다).
            시안·이전 구현은 git 이력에 있다 — 테마/i18n 티켓이 생기면 되살린다. */}
        <View className="gap-2">
          <SectionLabel>디스플레이</SectionLabel>
          <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
            <View className="flex-row items-center gap-5">
              {/* TODO(에셋): 밝기 아이콘 SVG 미제공 — 회색 원으로 임시 대체 */}
              <View className="h-6 w-6 rounded-full bg-background-assistive" />
              <BrightnessSlider />
            </View>
          </View>
        </View>

        {/* 알림 */}
        <View className="gap-2">
          <SectionLabel>알림</SectionLabel>
          <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
            {NOTIFICATION_ROWS.map((row) => (
              <SettingRow
                key={row.key}
                title={row.title}
                right={
                  <Toggle
                    value={notifications[row.key]}
                    onValueChange={(value) => handleNotificationChange(row.key, value)}
                  />
                }
              />
            ))}
          </View>
        </View>

        {/* 계정 관리 */}
        <View className="gap-2">
          <SectionLabel>계정 관리</SectionLabel>
          <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
            {/* 회원가입용 프로필 설정 화면을 수정 진입점으로 재사용한다 — 저장 API가 생기면
                기존 값 채우기/수정 전용 화면 분리를 다시 판단한다. */}
            <SettingRow
              title="회원 정보 수정"
              onPress={() => requireLogin() && navigation.navigate("ProfileEdit")}
              right={<Icon name="expand-right" color={colors.primary.normal} />}
            />
            <SettingRow title="로그아웃" onPress={handleLogoutPress} />
            <SettingRow
              title="회원탈퇴"
              onPress={() => requireLogin() && withdrawDialogRef.current?.open()}
              // 탈퇴는 서버 왕복을 기다렸다가 전환된다 — 그동안 진행 중임을 보여준다.
              right={withdrawing ? <ActivityIndicator size="small" color={colors.primary.normal} /> : undefined}
            />
          </View>
        </View>
      </View>

      <Text className="mt-10 pl-4.5 text-body-small text-text-neutral">버전정보 1.0.0</Text>

      <AppDialog
        ref={withdrawDialogRef}
        title="정말 탈퇴하시겠어요?"
        description="탈퇴하면 계정을 복구할 수 없어요"
        confirmLabel="탈퇴하기"
        cancelLabel="취소"
        onConfirm={handleWithdrawConfirm}
      />

      <AppToast ref={toastRef} />
    </ScrollView>
  );
}
