import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useThemeColors, type ThemeColors } from "../../../shared/theme/useThemeColors";
import type { UserRole } from "../types";

interface RoleBadgeProps {
  role: Exclude<UserRole, "member">;
  /** 팀장 배지의 "SNS팀 팀장" 표기에 쓰인다. 다른 등급은 무시한다. */
  teamName?: string;
}

// 등급별 배지 스타일 (시안 확정값). 일반 유저는 배지가 없으므로 role 타입에서 제외된다.
// TODO(에셋): 시안의 별(stars_filled) 아이콘이 assets/icons에 없어 12px 원으로 임시 대체.
//   SVG 받으면 Icon에 등록 후 교체.
// 글자색은 테마에 따라 달라서 함수로 두고, 렌더 때 현재 테마의 색을 넘겨 고른다.
const BADGE_STYLE = {
  teamLeader: {
    containerClassName: "bg-background-normal/85",
    contentColor: (c: ThemeColors) => c.primary.normal,
    label: (t: TFunction, teamName?: string) =>
      teamName ? t("{{team}} 팀장", { team: teamName }) : t("팀장"),
  },
  cellLeader: {
    containerClassName: "bg-background-normal/85",
    contentColor: (c: ThemeColors) => c.semantic.warning,
    label: (t: TFunction) => t("팔로워"),
  },
  admin: {
    containerClassName: "bg-background-dark",
    contentColor: (c: ThemeColors) => c.text.onImage,
    label: (t: TFunction) => t("관리자"),
  },
} as const;

export function RoleBadge({ role, teamName }: RoleBadgeProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const { containerClassName, contentColor: pickColor, label } = BADGE_STYLE[role];
  const contentColor = pickColor(themeColors);

  return (
    <View
      className={`flex-row items-center gap-1 rounded-2xl px-2.5 py-1 ${containerClassName}`}
    >
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: contentColor }} />
      <Text className="text-caption-main" style={{ color: contentColor }}>
        {label(t, teamName)}
      </Text>
    </View>
  );
}
