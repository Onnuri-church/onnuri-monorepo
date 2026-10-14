import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Fragment } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";

// 시안 좌표(402x874): 아이콘 원 top 169 — 상태바(44) 아래로 125.
const ICON_TOP = 125;

// 출석 시각 ISO → "2026.08.02 (일) 13:40" (시안 문구, KST 기준).
function toCheckedAtLabel(iso: string, weekdays: string[]): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${kst.getUTCFullYear()}.${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())} (${weekdays[kst.getUTCDay()]}) ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}

// QR을 찍고 나서 보는 결과. 성공과 중복이 아이콘·문구·카드 행만 다르고 배치가 같아서 한 화면이 둘을 그린다.
// 시안에 헤더가 없다 — 뒤로가기 없이 "확인"으로만 빠져나간다.
export function QrResultScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const { params } = useRoute<RouteProp<RootStackParamList, "QrResult">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const { result } = params;
  const weekdays = [t("일"), t("월"), t("화"), t("수"), t("목"), t("금"), t("토")];
  const timeLabel = toCheckedAtLabel(result.checkedAt, weekdays);
  const rows = result.duplicate
    ? [
        { label: t("예배"), value: result.serviceName },
        { label: t("출석 시각"), value: timeLabel },
      ]
    : [
        { label: t("예배"), value: result.serviceName },
        { label: t("일시"), value: timeLabel },
        { label: t("소속 셀"), value: result.cellName ?? t("없음") },
      ];

  // "확인"은 스캔 화면으로 돌아가지 않고 들어오기 전 화면까지 빠져나간다 — 출석이 끝난 뒤
  // 다시 조준 화면을 보여줄 이유가 없다.
  const handleConfirmPress = () => navigation.popToTop();

  return (
    <View className="flex-1 bg-background-normal px-5" style={{ paddingTop: insets.top }}>
      <View
        className={`h-20 w-20 items-center justify-center self-center rounded-full ${
          result.duplicate ? "bg-background-gold" : "bg-background-alternative"
        }`}
        style={{ marginTop: ICON_TOP }}
      >
        <Icon
          name={result.duplicate ? "warning" : "check"}
          size={40}
          color={result.duplicate ? themeColors.semantic.warning : themeColors.primary.normal}
        />
      </View>

      {/* 시안 간격: 원-문구 38, 문구 사이 20 (4px 스케일로 40·20) */}
      <View className="mt-10 items-center gap-5">
        <Text className="text-body-small-bold text-text-normal">
          {result.duplicate ? t("이미 출석 체크가 완료됐어요") : t("출석이 완료되었어요")}
        </Text>
        <Text className="text-center text-body-medium text-text-alternative">
          {result.duplicate
            ? t("오늘 이 예배는 이미 출석 처리가\n되어 있어요. QR을 다시 찍지 않아도 돼요.")
            : t("오늘도 예배 자리에 나와주셔서\n감사해요, {{name}}님!", { name: result.userName })}
        </Text>
      </View>

      {/* 행 사이 40에 구분선이 가운데 오도록 my-5로 나눠 준다 (마이페이지 MenuLinkCard와 같은 방식). */}
      <View className="mt-9 rounded-5 border border-background-assistive px-4 py-5">
        {rows.map((row, index) => (
          <Fragment key={row.label}>
            {index > 0 && <View className="my-5 h-px bg-background-assistive" />}
            <View className="flex-row items-center justify-between">
              <Text className="text-body-main text-text-normal">{row.label}</Text>
              <Text className="text-body-main text-text-alternative">{row.value}</Text>
            </View>
          </Fragment>
        ))}
      </View>

      <View className="mt-12">
        <Button label={t("확인")} onPress={handleConfirmPress} />
      </View>
    </View>
  );
}
