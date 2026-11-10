import { useTranslation } from "react-i18next";
import { Modal, Text, View } from "react-native";

import { Button } from "../../../shared/components/base/Button";
import { Logo } from "../../../shared/components/base/Logo";

interface SignupCompleteModalProps {
  visible: boolean;
  onConfirm: () => void;
}

// 가입 완료 팝업 (SCRUM-184) — 처음 가입한 사람이 프로필 설정을 마치면 한 번 뜬다.
// "메인으로"를 눌러야 세션이 확정돼 메인 화면으로 넘어간다 (그 전엔 프로필 설정 화면 위에 떠 있다).
export function SignupCompleteModal({ visible, onConfirm }: SignupCompleteModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onConfirm}>
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}>
        <View style={{ maxWidth: 320 }} className="w-full items-center gap-4 rounded-2xl bg-background-normal px-6 pb-6 pt-8">
          <Logo variant="symbol" width={72} />
          <Text className="text-heading-medium text-text-normal">{t("가입 완료")}</Text>
          <Text className="text-center text-body-regular text-text-alternative">
            {t("부산온누리교회 청년부 앱 가입이 완료되었어요.\n함께하게 되어 반가워요!")}
          </Text>
          <View className="mt-2 w-full">
            <Button label={t("메인으로")} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
