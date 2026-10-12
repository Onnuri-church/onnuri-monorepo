import { Modal, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
      {/* Android의 Modal은 별도 창이라 제스처(확대·축소)를 쓰려면 이 안에 루트 뷰가 따로 필요하다. */}
      {/* className이 아니라 style로 검정을 준다 — GestureHandlerRootView는 NativeWind 클래스를 못 받아 배경이 투명해진다. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
        {startIndex !== null && <PhotoPager urls={urls} initialIndex={startIndex} />}
        {/* 닫기 버튼은 사진 위에 얹는다 — 사진이 화면 가운데에 오게 영역을 나누지 않는다. */}
        <Pressable
          className="absolute left-5 h-10 w-10 items-center justify-center rounded-full bg-background-dark/50"
          style={{ top: insets.top + 8 }}
          onPress={onClose}
          hitSlop={8}
        >
          <Icon name="back" size={28} color={colors.icon.strong} />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}
