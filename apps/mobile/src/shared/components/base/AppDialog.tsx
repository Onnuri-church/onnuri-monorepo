import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { Pressable, Text, View } from "react-native";
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
}

// 시안 확정값: 좌우 여백 16, 화면 바닥에서 16 띄움, 라운드 20.
const HORIZONTAL_MARGIN = 16;
const BOTTOM_GAP = 16;
const CARD_RADIUS = 20;

// 화면 하단에 뜨는 카드형 팝업 (삭제 확인, 로그인 안내, 이동 확인 등).
// AppSheet과 나눠 두는 이유는 모양이다 — 시트는 화면 폭을 꽉 채우고 위쪽만 둥근데,
// 이 팝업은 좌우 여백을 두고 사방이 둥근 카드다. `detached` 모드가 그 배치를 만든다.
// 오버레이를 한 라이브러리로 통일한다는 규칙에 따라 여기서도 BottomSheetModal을 쓴다.
export const AppDialog = forwardRef<AppDialogRef, AppDialogProps>(function AppDialog(
  { title, description, confirmLabel, onConfirm, cancelLabel },
  ref,
) {
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

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
      bottomInset={insets.bottom + BOTTOM_GAP}
      style={{ marginHorizontal: HORIZONTAL_MARGIN }}
      backdropComponent={renderBackdrop}
      // 드래그 핸들은 시안에 없다. 버튼으로만 닫으므로 판다운도 끈다.
      handleComponent={null}
      enablePanDownToClose={false}
      backgroundStyle={{ borderRadius: CARD_RADIUS }}
    >
      <BottomSheetView>
        <View className="px-4 pb-4 pt-6">
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
                className="h-8 w-24 items-center justify-center rounded-xl bg-background-assistive active:opacity-60"
              >
                <Text className="text-body-medium text-text-normal">{cancelLabel}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onConfirm}
              className={`h-8 items-center justify-center rounded-xl bg-primary-normal active:opacity-80 ${
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
