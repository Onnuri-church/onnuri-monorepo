import { Text, View } from "react-native";

import type { AdminMemberBadge } from "../adminMock";

interface MemberBadgeProps {
  badge: AdminMemberBadge;
}

// 회원 관리 목록·상세의 등급 뱃지 (시안: 관리자 검정/흰글자, 팀장 초록/흰글자, 팔로워 회색/검정글자).
const BADGE_STYLE: Record<AdminMemberBadge, { containerClassName: string; textClassName: string; label: string }> = {
  admin: {
    containerClassName: "bg-background-dark",
    textClassName: "text-text-disable",
    label: "관리자",
  },
  teamLeader: {
    containerClassName: "bg-primary-normal",
    textClassName: "text-text-disable",
    label: "팀장",
  },
  cellLeader: {
    containerClassName: "bg-background-assistive",
    textClassName: "text-text-normal",
    label: "팔로워",
  },
};

export function MemberBadge({ badge }: MemberBadgeProps) {
  const { containerClassName, textClassName, label } = BADGE_STYLE[badge];

  return (
    <View className={`rounded px-1.5 py-0.5 ${containerClassName}`}>
      <Text className={`text-caption-small ${textClassName}`}>{label}</Text>
    </View>
  );
}
