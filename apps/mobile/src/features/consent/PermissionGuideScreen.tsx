import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { usePermissionGuideStore } from "../../shared/store/usePermissionGuideStore";
import { useThemeColors } from "../../shared/theme/useThemeColors";

type IconName = React.ComponentProps<typeof Icon>["name"];

// 앱 접근 권한 안내 (SCRUM-184) — 이 기기에서 앱을 처음 열 때 한 번만, 로그인보다 먼저 보여준다.
// 여기서 권한을 요청하지는 않는다 — 실제 허용 여부는 그 기능을 처음 쓸 때 OS가 묻는다 (알림은 홈의 안내 팝업,
// 카메라는 QR 출석, 사진은 사진 고르기). 모든 권한이 선택이라 허용하지 않아도 앱을 쓸 수 있다.
export function PermissionGuideScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const markSeen = usePermissionGuideStore((state) => state.markSeen);

  const items: { icon: IconName; title: string; description: string }[] = [
    {
      icon: "bell",
      title: t("알림 (선택)"),
      description: t("공지사항, 설교 영상 업로드, 라이브 예배, 댓글 소식 안내"),
    },
    {
      icon: "qr",
      title: t("카메라 (선택)"),
      description: t("예배 출석 QR 코드 촬영"),
    },
    {
      icon: "image",
      title: t("사진 (선택)"),
      description: t("프로필 사진과 게시글 사진 첨부"),
    },
  ];

  return (
    <View className="flex-1 bg-background-normal" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <ScrollView className="flex-1" contentContainerClassName="gap-10 px-5 pb-6 pt-14">
        <View className="gap-2">
          <Text className="text-title text-text-normal">{t("앱 접근 권한 안내")}</Text>
          <Text className="text-body-regular text-text-alternative">
            {t("청년부 앱 서비스 이용을 위해 다음 접근 권한 허용이 필요해요.")}
          </Text>
        </View>

        <View className="gap-7">
          {items.map((item) => (
            <View key={item.icon} className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-background-alternative">
                <Icon name={item.icon} size={28} color={themeColors.primary.normal} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-heading-small text-text-normal">{item.title}</Text>
                <Text className="text-body-small text-text-alternative">{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="h-px bg-background-muted" />
        <Text className="text-body-small text-text-alternative">
          {t("선택 권한을 허용하지 않아도 앱을 이용할 수 있지만, 일부 기능 이용에 제한이 있을 수 있어요.")}
        </Text>
      </ScrollView>

      <View className="px-5" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button label={t("확인")} onPress={markSeen} />
      </View>
    </View>
  );
}
