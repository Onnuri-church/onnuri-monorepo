import { Fragment } from "react";
import { Pressable, Text, View } from "react-native";

interface ProfileInfoCardProps {
  // links가 있으면 value 대신 눌러서 이동하는 항목들을 그린다 (소속 셀·소속 팀).
  rows: { label: string; value: string; links?: { label: string; onPress: () => void }[] }[];
}

// 회원 정보 카드 (이름 · 소속 셀 · 소속 팀). 행 사이 얇은 구분선은 시안의 0.5px 대신
// 스케일에 있는 1px(h-px)로 근사한다.
export function ProfileInfoCard({ rows }: ProfileInfoCardProps) {
  return (
    <View className="rounded-5 bg-background-normal px-4 py-5 shadow-card">
      {rows.map((row, index) => (
        <Fragment key={row.label}>
          {index > 0 && <View className="my-5 h-px bg-background-assistive" />}
          <View className="flex-row items-center justify-between">
            <Text className="text-body-main text-text-normal">{row.label}</Text>
            {row.links && row.links.length > 0 ? (
              <View className="flex-1 flex-row flex-wrap items-center justify-end pl-4">
                {row.links.map((link, linkIndex) => (
                  <Pressable key={link.label} onPress={link.onPress} hitSlop={6}>
                    <Text className="text-body-main text-text-alternative underline">
                      {link.label}
                      {linkIndex < row.links!.length - 1 ? ", " : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="text-body-main text-text-alternative">{row.value}</Text>
            )}
          </View>
        </Fragment>
      ))}
    </View>
  );
}
