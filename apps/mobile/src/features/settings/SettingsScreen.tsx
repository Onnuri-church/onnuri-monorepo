import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiClient } from "../../shared/api/client";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { Icon } from "../../shared/components/base/Icon";
import { Toggle } from "../../shared/components/base/Toggle";
import { signOut } from "../../shared/api/session";
import { LANGUAGES } from "../../shared/i18n";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { useLanguageStore } from "../../shared/store/useLanguageStore";
import { useThemeStore } from "../../shared/store/useThemeStore";
import { colors } from "../../shared/theme/tokens";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { submitConsent } from "../consent/api";
import { SettingRow } from "./components/SettingRow";
import Constants from "expo-constants";
import { useMe } from "../profile/useMe";

// 섹션 제목 시안 스타일(14px/600)과 버전정보(14px/400 #555555)는 등록된 텍스트 스타일·토큰에
// 없다 — caption-main(13/500)·body-small(13/400)+text.neutral로 근사했고, 등록 여부는
// 디자인(남현지) 확인 필요.
function SectionLabel({ children }: { children: string }) {
  return <Text className="text-caption-main text-text-alternative">{children}</Text>;
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const languageSheetRef = useRef<AppSheetRef>(null);
  const currentLanguageLabel = LANGUAGES.find((option) => option.code === language)?.label;
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 게스트도 설정에 들어올 수 있는데 계정이 필요한 행은 서버가 401로 거절한다 —
  // 실패 토스트/Alert 대신 로그인 안내부터 (기도제목 북마크와 같은 패턴).
  const requireLogin = () => {
    const { session } = useAuthStore.getState();
    if (session.status === "authenticated") return true;
    Alert.alert(t("로그인이 필요해요"), t("로그인 후 이용할 수 있어요."));
    return false;
  };

  const isGuest = useAuthStore((state) => state.session.status === "guest");
  const sensitiveConsented = useAuthStore((state) =>
    state.session.status === "authenticated" ? state.session.user.sensitiveConsented : false,
  );

  // 민감정보(큐티나눔·기도제목) 처리 동의는 선택이라 언제든 바꿀 수 있다 (SCRUM-175).
  // 철회해도 이미 쓴 글은 그대로고, 새 글쓰기만 막힌다.
  const { mutate: changeSensitiveConsent, isPending: changingConsent } = useMutation({
    mutationFn: (sensitive: boolean) => submitConsent({ sensitive }),
    onError: () => Alert.alert(t("동의를 저장하지 못했어요"), t("잠시 후 다시 시도해 주세요.")),
  });

  // 게스트 세션을 끝내면 RootNavigator가 로그인 화면으로 전환한다 (뒤로가기로 게스트 복귀).
  const handleGuestLoginPress = () => {
    useAuthStore.getState().startLoginFromGuest();
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
    // 서버가 막은 이유(예: 관리자 계정은 탈퇴 불가)가 있으면 그대로 보여준다 — 없으면 일반 안내.
    onError: (error) => {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message;
      Alert.alert(t("탈퇴하지 못했어요"), message ?? t("잠시 후 다시 시도해주세요."));
    },
  });

  // 탈퇴 확인 문구 (SCRUM-274). 다시 가입해도 기록이 이어지지 않는다는 점을 미리 알리고,
  // 셀장·팀장이면 맡은 자리가 비고 관리자에게 알림이 간다는 것도 알린다 (탈퇴를 막지는 않는다).
  const me = useMe();
  const leaderSeats = [
    ...(me?.cell && me.cell.role !== "MEMBER"
      ? [`${me.cell.name} ${me.cell.role === "LEADER" ? t("셀장") : t("부셀장")}`]
      : []),
    ...(me?.teams ?? [])
      .filter((team) => team.role === "LEADER")
      .map((team) => `${team.name} ${t("팀장")}`),
  ];
  const withdrawDescription = [
    t("탈퇴하면 계정을 복구할 수 없어요. 같은 계정으로 다시 가입해도 글·출석 기록·소속은 돌아오지 않아요."),
    ...(leaderSeats.length > 0
      ? [
          t("지금 {{seats}}을(를) 맡고 있어요. 탈퇴하면 자리가 비고 관리자에게 알림이 가요.", {
            seats: leaderSeats.join(", "),
          }),
        ]
      : []),
  ].join("\n\n");

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
        {/* 디스플레이 — 밝기 조절은 휴대폰 자체 기능과 겹쳐서 뺐다.
            다크모드는 2026-10-07에 되살렸다 (팔레트는 tokens.js darkColors).
            언어 선택(한국어/English)은 i18n(react-i18next, 번역 키 = 한국어 원문)을 붙이면서 되살렸다. */}
        <View className="gap-2">
          <SectionLabel>{t("디스플레이")}</SectionLabel>
          <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
            <SettingRow
              title={t("다크모드")}
              // 보조 문구는 "지금 누르면 어떻게 되는지"를 말한다 — 다크모드에서는 밝은 테마로 돌아간다는
              // 안내여야 한다. 늘 같은 문구라 토글을 눌러도 문구가 안 바뀐다는 제보가 있었다 (SCRUM-296).
              subtitle={themeMode === "dark" ? t("밝은 테마로 전환") : t("어두운 테마로 전환")}
              right={
                <Toggle
                  value={themeMode === "dark"}
                  onValueChange={(value) => setThemeMode(value ? "dark" : "light")}
                />
              }
            />
          </View>
        </View>

        {/* 언어 — 고르면 앱 문구가 바로 바뀐다 (사용자가 쓴 글·서버가 만든 문구는 그대로) */}
        <View className="gap-2">
          <SectionLabel>{t("언어")}</SectionLabel>
          <View className="rounded-5 bg-background-normal px-4 py-5 shadow-card">
            <SettingRow
              title={t("표시언어 선택")}
              onPress={() => languageSheetRef.current?.open()}
              right={
                <View className="flex-row items-center gap-1">
                  <Text className="text-body-small text-text-alternative">
                    {currentLanguageLabel}
                  </Text>
                  <Icon name="arrow-drop-down" color={colors.icon.accent} />
                </View>
              }
            />
          </View>
        </View>

        {/* 알림 — 종류별 토글은 별도 화면(NotificationSettings)에 모았다 */}
        <View className="gap-2">
          <SectionLabel>{t("알림")}</SectionLabel>
          <View className="rounded-5 bg-background-normal px-4 py-5 shadow-card">
            <SettingRow
              title={t("알림 설정")}
              onPress={() => navigation.navigate("NotificationSettings")}
              right={<Icon name="expand-right" color={colors.primary.normal} />}
            />
          </View>
        </View>

        {/* 약관·개인정보 — 문서 전문은 게스트도 볼 수 있다 */}
        <View className="gap-2">
          <SectionLabel>{t("개인정보")}</SectionLabel>
          <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
            {/* 문서 전문은 웹 대신 앱 안에서 보여준다 (SCRUM-184). */}
            <SettingRow
              title={t("서비스 이용약관")}
              onPress={() => navigation.navigate("PolicyDocument", { kind: "terms" })}
              right={<Icon name="expand-right" color={colors.primary.normal} />}
            />
            <SettingRow
              title={t("개인정보 처리방침")}
              onPress={() => navigation.navigate("PolicyDocument", { kind: "privacyPolicy" })}
              right={<Icon name="expand-right" color={colors.primary.normal} />}
            />
            {!isGuest && (
              <SettingRow
                title={t("차단 목록")}
                onPress={() => requireLogin() && navigation.navigate("BlockedUsers")}
                right={<Icon name="expand-right" color={colors.primary.normal} />}
              />
            )}
            {!isGuest && (
              <SettingRow
                title={t("민감정보 처리 동의")}
                subtitle={t("큐티나눔·기도제목 글쓰기에 필요해요")}
                right={
                  <Toggle
                    value={sensitiveConsented}
                    onValueChange={(value) => {
                      if (!changingConsent) changeSensitiveConsent(value);
                    }}
                  />
                }
              />
            )}
          </View>
        </View>

        {/* 계정 관리 */}
        <View className="gap-2">
          <SectionLabel>{t("계정 관리")}</SectionLabel>
          <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
            {/* 회원가입용 프로필 설정 화면을 수정 진입점으로 재사용한다 — 저장 API가 생기면
                기존 값 채우기/수정 전용 화면 분리를 다시 판단한다. */}
            {isGuest ? (
              // 게스트는 정보 수정·로그아웃·탈퇴할 계정이 없다 — 로그인 화면으로 가는 행만 둔다.
              // 로그인과 회원가입은 같은 소셜 로그인 화면이다 (처음이면 가입 + 프로필 설정이 이어진다).
              <SettingRow
                title={t("로그인 · 회원 가입하기")}
                onPress={handleGuestLoginPress}
                right={<Icon name="expand-right" color={colors.primary.normal} />}
              />
            ) : (
              <>
                <SettingRow
                  title={t("회원 정보 수정")}
                  onPress={() => requireLogin() && navigation.navigate("ProfileEdit")}
                  right={<Icon name="expand-right" color={colors.primary.normal} />}
                />
                <SettingRow title={t("로그아웃")} onPress={handleLogoutPress} />
                <SettingRow
                  title={t("회원탈퇴")}
                  onPress={() => requireLogin() && withdrawDialogRef.current?.open()}
                  // 탈퇴는 서버 왕복을 기다렸다가 전환된다 — 그동안 진행 중임을 보여준다.
                  right={
                    withdrawing ? (
                      <ActivityIndicator size="small" color={themeColors.primary.normal} />
                    ) : undefined
                  }
                />
              </>
            )}
          </View>
        </View>
      </View>

      {/* 앱 정보 — 운영·개발·문의, 오픈소스 라이선스 (SCRUM-238) */}
      <View className="mt-7.5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
        <SettingRow
          title={t("앱 정보")}
          onPress={() => navigation.navigate("AppInfo")}
          right={<Icon name="expand-right" color={colors.primary.normal} />}
        />
      </View>

      <Text className="mt-6 pl-4.5 text-body-small text-text-neutral">
        {t("버전정보 {{version}}", { version: Constants.expoConfig?.version ?? "1.0.0" })}
      </Text>

      <AppSheet
        ref={languageSheetRef}
        footer={
          <View className="bg-background-normal px-4 pb-4">
            <View className="border-t-2 border-background-assistive" />
            <Pressable
              onPress={() => languageSheetRef.current?.close()}
              className="pt-4"
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-center text-body-medium text-text-alternative">
                {t("취소")}
              </Text>
            </Pressable>
          </View>
        }
      >
        <View className="gap-6 p-4 pb-9">
          {LANGUAGES.map((option) => (
            <Pressable
              key={option.code}
              onPress={() => {
                setLanguage(option.code);
                languageSheetRef.current?.close();
              }}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text
                className={
                  option.code === language
                    ? "text-center text-body-main text-primary-normal"
                    : "text-center text-body-medium text-text-normal"
                }
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppSheet>

      <AppDialog
        ref={withdrawDialogRef}
        title={t("정말 탈퇴하시겠어요?")}
        description={withdrawDescription}
        confirmLabel={t("탈퇴하기")}
        cancelLabel={t("취소")}
        onConfirm={handleWithdrawConfirm}
      />
    </ScrollView>
  );
}
