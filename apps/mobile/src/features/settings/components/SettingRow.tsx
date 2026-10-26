import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { PressableScale } from "../../../shared/components/base/PressableScale";

interface SettingRowProps {
  title: string;
  /** 시안의 보조 설명 (예: 다크모드의 "어두운 테마로 전환"). */
  subtitle?: string;
  /** 우측 요소 — 토글, 화살표 아이콘 등. 없으면 텍스트만 있는 행이 된다. */
  right?: ReactNode;
  onPress?: () => void;
}

// 설정 카드 안의 한 행. 좌측 텍스트(제목+선택 보조설명) + 우측 요소 구조가
// 디스플레이/알림/계정 관리 카드에서 반복돼서 묶었다.
export function SettingRow({ title, subtitle, right, onPress }: SettingRowProps) {
  const content = (
    <>
      <View>
        <Text className="text-body-main text-text-normal">{title}</Text>
        {subtitle && <Text className="text-body-small text-text-alternative">{subtitle}</Text>}
      </View>
      {right}
    </>
  );

  // 눌리는 행(이동·로그아웃 등)만 스프링 눌림을 준다 — 토글이 오른쪽에 있는 행은 토글이 반응한다.
  if (onPress) {
    return (
      <PressableScale className="flex-row items-center justify-between" onPress={onPress} scaleTo={0.98}>
        {content}
      </PressableScale>
    );
  }
  return <View className="flex-row items-center justify-between">{content}</View>;
}
