import { useTranslation } from "react-i18next";
import { Text } from "react-native";

import { PressableScale } from "../../shared/components/base/PressableScale";

// 글 본문 아래 작은 "이 글 신고하기" (SCRUM-199). 남의 글이고 로그인했을 때만 화면이 그린다.
export function ReportPostLink({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <PressableScale scaleTo={0.95} onPress={onPress} hitSlop={8} className="mt-4 self-start">
      <Text className="text-body-small text-text-alternative underline">{t("이 글 신고하기")}</Text>
    </PressableScale>
  );
}
