import type { AppVersionPolicy } from "@onnuri/shared";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { Linking, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../shared/components/base/Button";
import { CURRENT_APP_VERSION } from "./useUpdateRequired";

// 강제 업데이트 안내 (SCRUM-193) — 지원이 끝난 예전 앱은 이 화면만 보인다. 스토어 주소가
// 설정돼 있으면 버튼으로 스토어를 연다 (출시 전이라 주소가 없으면 안내 문구만).
export function UpdateRequiredScreen({ policy }: { policy: AppVersionPolicy | null }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const storeUrl = Platform.OS === "ios" ? policy?.storeUrl.ios : policy?.storeUrl.android;

  return (
    <View
      className="flex-1 items-center justify-center bg-background-normal px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
    >
      <StatusBar style="dark" />
      <Text className="text-center text-heading-small text-text-normal">
        {t("업데이트가 필요해요")}
      </Text>
      <Text className="mt-3 text-center text-body-medium text-text-alternative">
        {t("더 안정적인 서비스를 위해 앱을 최신 버전으로 업데이트해 주세요.")}
      </Text>
      <Text className="mt-2 text-center text-caption-main text-text-assistive">
        {t("현재 버전 {{version}}", { version: CURRENT_APP_VERSION })}
      </Text>
      {storeUrl ? (
        <View className="mt-8 w-full">
          <Button label={t("업데이트하러 가기")} onPress={() => void Linking.openURL(storeUrl)} />
        </View>
      ) : (
        <Text className="mt-8 text-center text-body-small text-text-alternative">
          {t("스토어에서 앱을 업데이트해 주세요.")}
        </Text>
      )}
    </View>
  );
}
