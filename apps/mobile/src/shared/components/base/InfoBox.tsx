import { Fragment } from "react";
import { Text, View } from "react-native";

import { colors } from "../../theme/tokens";
import { Icon } from "./Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

export interface InfoBoxRow {
  icon: IconName;
  label: string;
  value: string;
}

interface InfoBoxProps {
  rows: InfoBoxRow[];
}

// 시안 확정값: 행 하나 330x49(h-12.25), 상자 높이 149 (49*3 + 구분선 1*2).
// 행은 상자 좌우에서 16씩 들어가므로(px-4) 상자가 362일 때 행이 330이 된다 — 안쪽 여백을 상자에 줘서
// 구분선도 같은 폭(330)으로 그어지게 한다. 상자 폭 자체는 박지 않는다: 호출부의 좌우 여백이 정한다.
// 라벨 열을 고정해야(w-10.5) 값의 시작 x가 행마다 맞고, 라벨-값 간격은 30(mr-7.5)이다.

// 아이콘 + 라벨 + 값을 한 줄씩 쌓는 정보 상자. 무슨 정보인지는 모르고 행 목록만 받는다.
export function InfoBox({ rows }: InfoBoxProps) {
  return (
    <View className="overflow-hidden rounded-2xl bg-background-muted px-4">
      {rows.map((row, index) => (
        <Fragment key={row.label}>
          {index > 0 && <View className="h-px bg-background-normal" />}
          <View className="h-12.25 flex-row items-center">
            <Icon name={row.icon} size={20} color={colors.icon.normal} />
            <Text className="ml-3 mr-7.5 w-10.5 text-label-medium text-text-alternative">
              {row.label}
            </Text>
            <Text className="text-body-main text-text-normal">{row.value}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
