import { Image, Text, View } from "react-native";

interface MemberRowProps {
  name: string;
  /** 화면에 그대로 찍는 역할 문구 (예: "팀장"). 서버가 계산해 내려준다. */
  roleLabel: string;
  avatarUrl?: string | null;
}

// 팀원 한 줄. 팀원에게 이름·역할이 있다는 걸 아는 도메인 컴포넌트라 feature에 둔다
// (DESIGN.md 컴포넌트 배치 규칙). 팀 상세의 팀원 미리보기와 팀원 리스트가 같이 쓴다.
// 시안 확정값: 행 높이 60(py-2.5 + 아바타 40), 아바타 40, 아바타-이름 간격 16.
export function MemberRow({ name, roleLabel, avatarUrl }: MemberRowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-text-assistive py-2.5">
      <View className="flex-row items-center gap-4">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-10 w-10 rounded-full" />
        ) : (
          <View className="h-10 w-10 rounded-full bg-text-assistive" />
        )}
        <Text className="text-body-main text-text-normal">{name}</Text>
      </View>
      <Text className="text-body-small text-primary-normal">{roleLabel}</Text>
    </View>
  );
}
