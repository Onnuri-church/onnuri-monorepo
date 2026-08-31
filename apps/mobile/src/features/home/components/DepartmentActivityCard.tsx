import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Chip } from "../../../shared/components/base/Chip";
import { getDepartmentColor } from "../../department-activity/departmentColor";

interface DepartmentActivityCardProps {
  /** 부서 키. 배지 색을 정한다 — 부서활동 게시판과 같은 매핑을 쓴다. */
  department: string;
  /** 배지에 찍히는 부서 이름 (예: "찬양팀") */
  departmentName: string;
  title: string;
  imageUrl?: string;
  onPress?: () => void;
}

// 홈 부서활동 가로 스크롤 카드. 시안 확정값: 카드 폭 150, 썸네일 150x160(라운드 20),
// 썸네일-제목 간격 8, 배지는 썸네일 좌상단에서 8/8.
// 부서활동 게시판의 TeamPostCard와는 모양이 아예 달라(썸네일 없음, 통계 줄 있음) 따로 만든다.
export function DepartmentActivityCard({
  department,
  departmentName,
  title,
  imageUrl,
  onPress,
}: DepartmentActivityCardProps) {
  return (
    <Pressable className="w-37.5 gap-2 active:opacity-80" onPress={onPress}>
      <View className="h-40 overflow-hidden rounded-5 bg-text-assistive">
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View className="absolute left-2 top-2">
          <Chip color={getDepartmentColor(department)} size="small" text={departmentName} />
        </View>
      </View>
      <Text className="text-body-medium text-text-normal" numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}
