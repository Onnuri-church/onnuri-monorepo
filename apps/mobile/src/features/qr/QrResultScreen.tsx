import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Fragment } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";

// 시안 좌표(402x874): 아이콘 원 top 169 — 상태바(44) 아래로 125.
const ICON_TOP = 125;

// TODO(API): 출석 결과 연동 전 — 시안 문구를 그대로 쓴다.
const MOCK_CHECK_IN = {
  name: "온누리",
  service: "4부 청년 주일예배",
  time: "2026.08.02 (일) 13:40",
  cell: "누리셀",
};

// QR을 찍고 나서 보는 결과. 성공과 중복이 아이콘·문구·카드 행만 다르고 배치가 같아서 한 화면이 둘을 그린다.
// 시안에 헤더가 없다 — 뒤로가기 없이 "확인"으로만 빠져나간다.
export function QrResultScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "QrResult">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const { duplicate } = params;
  const rows = duplicate
    ? [
        { label: "예배", value: MOCK_CHECK_IN.service },
        { label: "출석 시각", value: MOCK_CHECK_IN.time },
      ]
    : [
        { label: "예배", value: MOCK_CHECK_IN.service },
        { label: "일시", value: MOCK_CHECK_IN.time },
        { label: "소속 셀", value: MOCK_CHECK_IN.cell },
      ];

  // "확인"은 스캔 화면으로 돌아가지 않고 들어오기 전 화면까지 빠져나간다 — 출석이 끝난 뒤
  // 다시 조준 화면을 보여줄 이유가 없다.
  const handleConfirmPress = () => navigation.popToTop();

  return (
    <View className="flex-1 bg-background-normal px-5" style={{ paddingTop: insets.top }}>
      <View
        className={`h-20 w-20 items-center justify-center self-center rounded-full ${
          duplicate ? "bg-background-gold" : "bg-background-alternative"
        }`}
        style={{ marginTop: ICON_TOP }}
      >
        <Icon
          name={duplicate ? "warning" : "check"}
          size={40}
          color={duplicate ? colors.semantic.warning : colors.primary.normal}
        />
      </View>

      {/* 시안 간격: 원-문구 38, 문구 사이 20 (4px 스케일로 40·20) */}
      <View className="mt-10 items-center gap-5">
        <Text className="text-body-small-bold text-text-normal">
          {duplicate ? "이미 출석 체크가 완료됐어요" : "출석이 완료되었어요"}
        </Text>
        <Text className="text-center text-body-medium text-text-alternative">
          {duplicate
            ? "오늘 이 예배는 이미 출석 처리가\n되어 있어요. QR을 다시 찍지 않아도 돼요."
            : `오늘도 예배 자리에 나와주셔서\n감사해요, ${MOCK_CHECK_IN.name}님!`}
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
        <Button label="확인" onPress={handleConfirmPress} />
      </View>
    </View>
  );
}
