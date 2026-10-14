import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface AppToastRef {
  /** 메시지를 띄운다 — 이미 떠 있으면 내용만 바꾸고 타이머를 다시 센다. */
  show: (message: string) => void;
}

// 떠 있는 시간. 한 줄 안내를 읽기엔 충분하고, 연속 조작(토글 여러 개)을 가리지 않을 만큼 짧게.
const DURATION_MS = 1500;
const BOTTOM_GAP = 24;

// 화면 하단에 잠깐 떴다 사라지는 한 줄 안내 (알림 토글 저장 피드백 등).
// 확인 버튼이 없는 게 AppDialog와의 차이다 — 흐름을 끊지 않는 피드백 전용이라
// 배경 어둡기(backdrop) 없이 띄우고, 알아서 닫힌다.
// 오버레이를 한 라이브러리로 통일한다는 규칙(DESIGN.md)에 따라 BottomSheetModal로 띄운다.
export const AppToast = forwardRef<AppToastRef>(function AppToast(_props, ref) {
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => modalRef.current?.dismiss(), DURATION_MS);
  };

  useImperativeHandle(
    ref,
    () => ({
      show: (next: string) => {
        setMessage(next);
        modalRef.current?.present();
        scheduleHide();
      },
    }),
    [],
  );

  // 뜨는 애니메이션이 끝나기 전에 dismiss가 불리면 무시되는 경우가 있어(JS가 바쁠 때),
  // 완전히 뜬 시점(onChange ≥ 0)에 타이머를 다시 건다 — show의 타이머와 겹쳐도 뒤가 이긴다.
  const handleSheetChange = (index: number) => {
    if (index >= 0) scheduleHide();
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      // detached + bottomInset으로 바닥에서 띄운다 (AppDialog와 같은 배치 방식).
      detached
      bottomInset={insets.bottom + BOTTOM_GAP}
      style={{ marginHorizontal: 16 }}
      // 안내일 뿐이라 뒤를 어둡게 하지 않고(backdrop 없음) 드래그로도 닫지 않는다.
      handleComponent={null}
      enablePanDownToClose={false}
      // 알약 모양은 안쪽 Text가 그린다 — 시트 자체 배경은 투명하게 비운다.
      backgroundStyle={{ backgroundColor: "transparent" }}
      onChange={handleSheetChange}
    >
      <BottomSheetView>
        <View className="items-center">
          {/* 어두운 알약 — 밝은 화면 어디서든 보이도록 가장 진한 텍스트 색을 배경으로 쓴다. */}
          <Text className="rounded-5 bg-text-normal px-5 py-3 text-body-small text-background-normal">
            {message}
          </Text>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
