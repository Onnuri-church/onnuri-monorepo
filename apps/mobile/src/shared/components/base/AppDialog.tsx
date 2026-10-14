import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface AppDialogRef {
  open: () => void;
  close: () => void;
}

interface AppDialogProps {
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** 주면 취소 버튼이 왼쪽에 붙고, 안 주면 확인 버튼 하나가 카드 폭을 다 쓴다. */
  cancelLabel?: string;
  /** 카드가 뜨는 위치. 기본은 화면 아래("bottom"), 팀 관리처럼 시안이 가운데면 "center". */
  placement?: "bottom" | "center";
}

// 시안 확정값: 좌우 여백 16, 화면 바닥에서 16 띄움, 라운드 20.
const HORIZONTAL_MARGIN = 16;
const BOTTOM_GAP = 16;
const CARD_RADIUS = 20;
// 가운데 팝업은 시안이 폭 320 고정·카드 라운드 16·버튼 라운드 8이다
// (하단 팝업은 좌우 16 여백·카드 라운드 20·버튼 라운드 12) —
// 두 시안의 스펙 차이라 placement 하나로 위치·폭·라운드를 같이 정한다.
// 이 값들은 시안의 도형이 벡터라 CSS에 radius가 안 실려서, SVG 패스의 곡선에서 읽었다.
const CENTER_CARD_WIDTH = 320;
const CENTER_CARD_RADIUS = 16;
// 가운데 배치를 첫 렌더부터 맞추기 위한 카드 높이 어림값 (시안 144).
// 그려진 뒤 onLayout이 실제 높이로 덮어쓴다 — 어림값이 없으면 첫 프레임이 아래에 잡힌다.
const ESTIMATED_CARD_HEIGHT = 144;

// 화면 하단에 뜨는 카드형 팝업 (삭제 확인, 로그인 안내, 이동 확인 등).
// AppSheet과 나눠 두는 이유는 모양이다 — 시트는 화면 폭을 꽉 채우고 위쪽만 둥근데,
// 이 팝업은 좌우 여백을 두고 사방이 둥근 카드다. `detached` 모드가 그 배치를 만든다.
// 오버레이를 한 라이브러리로 통일한다는 규칙에 따라 여기서도 BottomSheetModal을 쓴다.
export const AppDialog = forwardRef<AppDialogRef, AppDialogProps>(function AppDialog(
  { title, description, confirmLabel, onConfirm, cancelLabel, placement = "bottom" },
  ref,
) {
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // 가운데 배치는 카드 높이를 알아야 계산되는데 높이는 내용에 따라 정해진다.
  // 어림값으로 시작해 첫 렌더부터 가운데에 두고, onLayout으로 실제 높이를 받아 보정한다.
  const [cardHeight, setCardHeight] = useState(ESTIMATED_CARD_HEIGHT);

  const bottomGap = insets.bottom + BOTTOM_GAP;
  const bottomInset =
    placement === "center" ? Math.max((windowHeight - cardHeight) / 2, bottomGap) : bottomGap;
  // 완성된 클래스 문자열로 고른다 — NativeWind는 빌드 때 정적으로 수집해서 문자열 조합을 못 읽는다.
  const buttonRadius = placement === "center" ? "rounded-lg" : "rounded-xl";
  const horizontalMargin =
    placement === "center"
      ? Math.max((windowWidth - CENTER_CARD_WIDTH) / 2, HORIZONTAL_MARGIN)
      : HORIZONTAL_MARGIN;

  useImperativeHandle(
    ref,
    () => ({
      open: () => modalRef.current?.present(),
      close: () => modalRef.current?.dismiss(),
    }),
    [],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      // detached + bottomInset이 시트를 바닥에서 띄워 카드로 만든다. 좌우 여백은 style로 준다.
      detached
      bottomInset={bottomInset}
      style={{ marginHorizontal: horizontalMargin }}
      backdropComponent={renderBackdrop}
      // 드래그 핸들은 시안에 없다. 버튼으로만 닫으므로 판다운도 끈다.
      handleComponent={null}
      enablePanDownToClose={false}
      backgroundStyle={{ borderRadius: placement === "center" ? CENTER_CARD_RADIUS : CARD_RADIUS }}
    >
      <BottomSheetView>
        <View
          className="px-4 pb-4 pt-6"
          onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        >
          <Text className="text-center text-body-main text-text-normal">{title}</Text>
          {description && (
            <Text className="mt-2 text-center text-body-regular text-text-alternative">
              {description}
            </Text>
          )}

          <View className="mt-4 flex-row justify-center gap-4">
            {cancelLabel && (
              <Pressable
                onPress={() => modalRef.current?.dismiss()}
                className={`h-8 w-24 items-center justify-center bg-background-assistive active:opacity-60 ${buttonRadius}`}
              >
                <Text className="text-body-medium text-text-normal">{cancelLabel}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onConfirm}
              className={`h-8 items-center justify-center bg-primary-normal active:opacity-80 ${buttonRadius} ${
                cancelLabel ? "w-24" : "flex-1"
              }`}
            >
              <Text className="text-body-main text-background-normal">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
