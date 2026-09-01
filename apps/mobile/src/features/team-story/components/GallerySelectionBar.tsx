import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

interface GallerySelectionBarProps {
  selectedCount: number;
  onDeletePress?: () => void;
}

// 갤러리 선택 모드에서 화면 아래에 붙는 줄. 몇 장 골랐는지와 삭제 버튼만 보여준다.
// 언제 보일지는 화면이 정한다 — 이 컴포넌트는 개수만 받는다.
// 시안 확정값: 위아래 여백 20, 위쪽 구분선 1, 아이콘 18, 아이콘-글자 간격 4.
export function GallerySelectionBar({ selectedCount, onDeletePress }: GallerySelectionBarProps) {
  return (
    <View className="flex-row items-center justify-between border-t border-text-assistive py-5">
      <Text className="text-body-medium text-text-alternative">{selectedCount}장 선택됨</Text>
      <Pressable className="flex-row items-center gap-1" onPress={onDeletePress}>
        <Icon name="trash-can" size={18} color={colors.semantic.danger} />
        <Text className="text-body-medium text-semantic-danger">삭제</Text>
      </Pressable>
    </View>
  );
}
