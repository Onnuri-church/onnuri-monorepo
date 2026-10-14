import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { AdminMemberBadge } from "@onnuri/shared";

interface MemberBadgeProps {
  badge: AdminMemberBadge;
}

// 회원 관리 목록·상세의 등급 뱃지 (시안: 관리자 검정/흰글자, 팀장 초록/흰글자, 팔로워 회색/검정글자).
const BADGE_STYLE: Record<AdminMemberBadge, { containerClassName: string; textClassName: string }> = {
  admin: {
    containerClassName: "bg-background-dark",
    textClassName: "text-text-onImage",
  },
  teamLeader: {
    containerClassName: "bg-primary-normal",
    textClassName: "text-text-disable",
  },
  cellLeader: {
    containerClassName: "bg-background-assistive",
    textClassName: "text-text-normal",
  },
};

export function MemberBadge({ badge }: MemberBadgeProps) {
  const { t } = useTranslation();
  const { containerClassName, textClassName } = BADGE_STYLE[badge];
  const label = {
    admin: t("관리자"),
    teamLeader: t("팀장"),
    cellLeader: t("팔로워"),
  }[badge];

  return (
    <View className={`shrink-0 rounded px-1.5 py-0.5 ${containerClassName}`}>
      <Text className={`text-caption-small ${textClassName}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
