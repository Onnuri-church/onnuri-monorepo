import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { Icon } from "../../shared/components/base/Icon";
import { Toggle } from "../../shared/components/base/Toggle";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { BrightnessSlider } from "./components/BrightnessSlider";
import { SettingRow } from "./components/SettingRow";

// 알림 종류별 켜짐 여부. 푸시 알림 기능이 아직 없어서 화면 로컬 상태로만 동작한다 —
// 기능이 붙으면 서버 저장으로 교체.
const NOTIFICATION_ROWS = [
  { key: "sermonUpload", title: "말씀영상 업로드 알림" },
  { key: "liveStart", title: "실시간 예배 시작 알림" },
  { key: "qtComment", title: "큐티나눔 새글 알림" },
] as const;

type NotificationKey = (typeof NOTIFICATION_ROWS)[number]["key"];

// 지원 언어 목록은 팀 확정 전 최소 구성이다. 선택값 저장까지만 하고,
// 실제 번역(i18n) 적용은 앱 전체 텍스트 작업이 필요해 후속 티켓으로 미룬다.
const LANGUAGES = ["한국어", "English"];

// 섹션 제목 시안 스타일(14px/600)과 버전정보(14px/400 #555555)는 등록된 텍스트 스타일·토큰에
// 없다 — caption-main(13/500)·body-small(13/400)+text.neutral로 근사했고, 등록 여부는
// 디자인(남현지) 확인 필요.
function SectionLabel({ children }: { children: string }) {
  return <Text className="text-caption-main text-text-alternative">{children}</Text>;
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const clearSession = useAuthStore((state) => state.clearSession);
  const languageSheetRef = useRef<AppSheetRef>(null);

  // TODO(디자인): 다크 팔레트 시안이 아직 없어 실제 테마 전환은 못 붙인다 — 토글 상태만 동작.
  //   다크 컬러차트를 받으면 tokens.js 확장과 함께 연결한다.
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("한국어");
  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    sermonUpload: true,
    liveStart: true,
    qtComment: true,
  });

  const handleNotificationChange = (key: NotificationKey, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const handleLanguageSelect = (option: string) => {
    setLanguage(option);
    languageSheetRef.current?.close();
  };

  const handleLogoutPress = () => {
    clearSession();
  };

  return (
    <ScrollView className="bg-background-normal" contentContainerClassName="px-5 pb-10 pt-14">
      <View className="gap-7.5">
        {/* 디스플레이 */}
        <View className="gap-2">
          <SectionLabel>디스플레이</SectionLabel>
          <View className="gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
            <View className="flex-row items-center gap-5">
              {/* TODO(에셋): 밝기 아이콘 SVG 미제공 — 회색 원으로 임시 대체 */}
              <View className="h-6 w-6 rounded-full bg-background-assistive" />
              <BrightnessSlider />
            </View>
            <SettingRow
              title="다크모드"
              subtitle="어두운 테마로 전환"
              right={<Toggle value={darkMode} onValueChange={setDarkMode} />}
            />
          </View>
        </View>

        {/* 언어 */}
        <View className="gap-2">
          <SectionLabel>언어</SectionLabel>
          <View className="rounded-5 bg-background-normal px-4 py-5 shadow-card">
            <SettingRow
              title="표시언어 선택"
              onPress={() => languageSheetRef.current?.open()}
              right={
                <View className="flex-row items-center gap-1">
                  {/* 시안에는 선택값 표시가 없다 — 현재 언어를 알 방법이 없어 임시로 노출. 위치는 확인 필요 */}
                  <Text className="text-body-small text-text-alternative">{language}</Text>
                  <Icon name="arrow-drop-down" color={colors.icon.accent} />
                </View>
              }
            />
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
              onPress={() => navigation.navigate("ProfileEdit")}
              right={<Icon name="expand-right" color={colors.primary.normal} />}
            />
            <SettingRow title="로그아웃" onPress={handleLogoutPress} />
            {/* TODO(기능): 회원탈퇴 플로우(확인 팝업·API) 미정 — 행만 둔다 */}
            <SettingRow title="회원탈퇴" />
          </View>
        </View>
      </View>

      <Text className="mt-10 pl-4.5 text-body-small text-text-neutral">버전정보 1.0.0</Text>

      {/* 언어 선택 시트 — SelectField의 시트 구성(항목 목록 + 바닥 고정 취소)과 같은 패턴 */}
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
              <Text className="text-center text-body-medium text-text-alternative">취소</Text>
            </Pressable>
          </View>
        }
      >
        <View className="gap-6 p-4 pb-9">
          {LANGUAGES.map((option) => (
            <Pressable
              key={option}
              onPress={() => handleLanguageSelect(option)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-center text-body-medium text-text-normal">{option}</Text>
            </Pressable>
          ))}
        </View>
      </AppSheet>
    </ScrollView>
  );
}
