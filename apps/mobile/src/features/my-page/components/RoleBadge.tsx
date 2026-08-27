import { Text, View } from "react-native";

import { colors } from "../../../shared/theme/tokens";
import type { UserRole } from "../types";

interface RoleBadgeProps {
  role: Exclude<UserRole, "member">;
  /** 팀장 배지의 "SNS팀 팀장" 표기에 쓰인다. 다른 등급은 무시한다. */
  teamName?: string;
}

// 등급별 배지 스타일 (시안 확정값). 일반 유저는 배지가 없으므로 role 타입에서 제외된다.
// TODO(에셋): 시안의 별(stars_filled) 아이콘이 assets/icons에 없어 12px 원으로 임시 대체.
//   SVG 받으면 Icon에 등록 후 교체.
const BADGE_STYLE = {
  teamLeader: {
    containerClassName: "bg-background-normal/85",
    contentColor: colors.primary.normal,
    label: (teamName?: string) => `${teamName ?? ""} 팀장`.trim(),
  },
  cellLeader: {
    containerClassName: "bg-background-normal/85",
    contentColor: colors.semantic.warning,
    label: () => "팔로워",
  },
  admin: {
    containerClassName: "bg-background-dark",
    contentColor: colors.text.disable,
    label: () => "관리자",
  },
} as const;

export function RoleBadge({ role, teamName }: RoleBadgeProps) {
  const { containerClassName, contentColor, label } = BADGE_STYLE[role];

  return (
    <View
      className={`flex-row items-center gap-1 rounded-2xl px-2.5 py-1 ${containerClassName}`}
    >
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: contentColor }} />
      <Text className="text-caption-main" style={{ color: contentColor }}>
        {label(teamName)}
      </Text>
    </View>
  );
}
