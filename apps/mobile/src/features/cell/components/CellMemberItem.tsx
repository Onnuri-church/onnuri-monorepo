import { Text, View } from "react-native";

import { Avatar } from "../../../shared/components/base/Avatar";
import type { CellMember } from "../cellDetail";

// 셀장·부셀장 뱃지 색 (시안 확정: 셀장 = Primary/Normal, 부셀장 = Icon/Strong).
const BADGE_STYLE: Record<"leader" | "viceLeader", { bg: string; label: string }> = {
  leader: { bg: "bg-primary-normal", label: "셀장" },
  viceLeader: { bg: "bg-icon-strong", label: "부셀장" },
};

interface CellMemberItemProps {
  member: CellMember;
}

// 구성원 탭 그리드의 한 칸 (시안: 아바타 60 + 이름, 뱃지는 아바타 하단에 겹침 — top 49를 48로 근사).
export function CellMemberItem({ member }: CellMemberItemProps) {
  const badge = member.role === "member" ? null : BADGE_STYLE[member.role];

  return (
    <View className="w-15 items-center">
      <Avatar imageUrl={member.avatarUrl} size={60} />
      <Text className="mt-2 text-caption-main text-text-normal" numberOfLines={1}>
        {member.name}
      </Text>
      {badge && (
        <View className={`absolute top-12 rounded-5 px-2 py-0.5 ${badge.bg}`}>
          <Text className="text-caption-small text-text-disable">{badge.label}</Text>
        </View>
      )}
    </View>
  );
}
