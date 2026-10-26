import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { PressableScale } from "../../../shared/components/base/PressableScale";

interface BulletinCardProps {
  date: string;
  /** 같은 날 설교 제목 — 설교영상이 아직 안 올라온 주는 null이라 날짜만 보인다 */
  title: string | null;
  /** 나눔지가 있을 때만 "/ 나눔지" 링크를 그린다 */
  hasHandout?: boolean;
  onBulletinPress?: () => void;
  onSharePress?: () => void;
}

// 주보 목록의 한 줄. 왼쪽에 발행일과 설교 제목이 쌓이고, 오른쪽에 주보·나눔지 두 개의 링크가 온다.
// 시안 확정값(Frame 7373): 왼쪽 열 높이 47 = 발행일 13*1.4 + 간격 8 + 제목 15*1.4.
// 위아래 18(py-4.5)은 시안의 구분선 간격 83에서 나온다 — 행 사이 36을 구분선이 반씩 나눠 가진다.
export function BulletinCard({
  date,
  title,
  hasHandout = true,
  onBulletinPress,
  onSharePress,
}: BulletinCardProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between border-b border-background-muted py-4.5">
      <View className="flex-1 gap-2">
        <Text className="text-body-small text-primary-normal">{date}</Text>
        {title && <Text className="text-body-main text-text-normal">{title}</Text>}
      </View>
      <View className="flex-row items-center gap-2.5">
        <PressableScale
          scaleTo={0.98}
          onPress={onBulletinPress}
        >
          <Text className="text-body-main text-primary-normal">{t("주보")}</Text>
        </PressableScale>
        {hasHandout && (
          <>
            {/* 구분자는 링크와 색은 같고 스타일만 작다 — 시안이 링크는 Body/Main, /는 Body/Small이다. */}
            <Text className="text-body-small text-primary-normal">/</Text>
            <PressableScale
              scaleTo={0.98}
              onPress={onSharePress}
            >
              <Text className="text-body-main text-primary-normal">{t("나눔지")}</Text>
            </PressableScale>
          </>
        )}
      </View>
    </View>
  );
}
