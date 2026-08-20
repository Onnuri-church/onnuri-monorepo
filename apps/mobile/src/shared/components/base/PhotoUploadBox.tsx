import { Pressable, Text } from "react-native";

import { Icon } from "./Icon";
import { colors } from "../../theme/tokens";

interface PhotoUploadBoxProps {
  label: string;
  /** 박스 전체 터치 = 사진 선택. */
  onPress?: () => void;
  /** 우상단 X = 선택 해제. */
  onRemovePress?: () => void;
}

// 사진 업로드 슬롯. 폭은 호출부가 정하고(flex-1로 나눠 쓰는 전제) 높이는 aspect-square로 따라온다.
export function PhotoUploadBox({ label, onPress, onRemovePress }: PhotoUploadBoxProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 aspect-square items-center justify-center rounded-2xl border border-dashed border-icon-normal bg-background-muted"
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      <Icon name="add-round-light" size={36} color={colors.icon.normal} />
      <Text className="text-body-regular text-text-alternative">{label}</Text>
      {/* 안쪽 Pressable은 onPress가 실제로 달려 있어야 터치를 가져간다 —
          핸들러가 없으면 박스(사진 선택)로 넘어가므로 빈 함수라도 채운다. */}
      <Pressable
        onPress={onRemovePress ?? (() => {})}
        className="absolute right-0 top-0 p-2"
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Icon name="close-square" size={30} color={colors.text.normal} />
      </Pressable>
    </Pressable>
  );
}
