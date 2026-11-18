import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../shared/components/base/Icon";
import { Logo } from "../../shared/components/base/Logo";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";

// 공식 문의처 — 이용약관·개인정보처리방침과 같은 청년부 공용 메일 (SCRUM-238).
// 담당자가 바뀌어도 이 메일은 그대로 두고, 개발 크레딧만 바꾸면 된다.
const CONTACT_EMAIL = "onnuriyouth1234@gmail.com";

// 앱 정보 (SCRUM-238) — 앱 소개, 운영·개발·문의, 오픈소스 라이선스.
// 운영(책임 주체)은 청년부, 개발은 만든 사람의 크레딧으로만 적는다.
export function AppInfoScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const rows: { label: string; value: string; onPress?: () => void }[] = [
    { label: t("운영"), value: t("부산온누리교회 청년부") },
    { label: t("개발"), value: t("이지환") },
    {
      label: t("문의"),
      value: CONTACT_EMAIL,
      onPress: () => void Linking.openURL(`mailto:${CONTACT_EMAIL}`),
    },
  ];

  return (
    <ScrollView
      className="bg-background-normal"
      contentContainerClassName="px-5 pt-10"
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      <View className="items-center gap-3">
        <Logo variant="horizontal-green" width={180} />
        <Text className="text-body-small text-text-alternative">
          {t("버전 {{version}}", { version })}
        </Text>
        <Text className="mt-2 text-center text-body-medium text-text-neutral">
          {t("부산온누리교회 청년부가 말씀과 기도, 일상을 함께 나누는 앱이에요.")}
        </Text>
      </View>

      <View className="mt-10 gap-5 rounded-5 bg-background-normal px-4 py-5 shadow-card">
        {rows.map((row) => (
          <Pressable
            key={row.label}
            disabled={!row.onPress}
            onPress={row.onPress}
            className="flex-row items-center justify-between active:opacity-60"
          >
            <Text className="text-body-main text-text-alternative">{row.label}</Text>
            <Text
              className={
                row.onPress
                  ? "text-body-main text-primary-normal underline"
                  : "text-body-main text-text-normal"
              }
            >
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-4 rounded-5 bg-background-normal px-4 py-5 shadow-card">
        <Pressable
          className="flex-row items-center justify-between active:opacity-60"
          onPress={() => navigation.navigate("OpenSourceLicenses")}
        >
          <Text className="text-body-main text-text-normal">{t("오픈소스 라이선스")}</Text>
          <Icon name="expand-right" color={colors.primary.normal} />
        </Pressable>
      </View>
    </ScrollView>
  );
}
