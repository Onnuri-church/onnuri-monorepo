import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../../shared/components/base/Icon";
import { PhotoPager } from "../../../shared/components/composed/PhotoPager";
import { colors } from "../../../shared/theme/tokens";

interface ChatImageViewerProps {
  urls: string[];
  /** null이면 닫힘, 숫자면 그 장부터 연다 */
  startIndex: number | null;
  onClose: () => void;
}

// 단톡방 사진 확대 보기 — 검정 배경에서 좌우로 밀어 넘긴다 (갤러리 뷰어와 같은 PhotoPager).
export function ChatImageViewer({ urls, startIndex, onClose }: ChatImageViewerProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={startIndex !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top }}>
        <Pressable className="h-12 justify-center px-5" onPress={onClose} hitSlop={8}>
          <Icon name="back" size={28} color={colors.icon.strong} />
        </Pressable>
        {startIndex !== null && <PhotoPager urls={urls} initialIndex={startIndex} />}
      </View>
    </Modal>
  );
}
