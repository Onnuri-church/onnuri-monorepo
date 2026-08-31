import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { type ReactNode, forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/tokens";

export interface AppSheetRef {
  open: () => void;
  close: () => void;
}

interface AppSheetProps {
  children: ReactNode;
  /** 내용이 스크롤돼도 시트 바닥에 붙어 있는 영역(취소 버튼 등). 배경은 넘기는 쪽에서 칠한다. */
  footer?: ReactNode;
}

// 시트 최대 높이. 시안 확정값(402x874 프레임의 750)을 비율로 옮긴 값이다.
const MAX_HEIGHT_RATIO = 0.86;

// 화면 아래에서 올라오는 오버레이. 여닫기는 호출부가 ref로 제어한다 —
// 전역 store 구독형은 지금 부르는 곳이 한 곳뿐이라 두지 않았다.
//
// 높이는 snapPoint 고정이 아니라 내용에 맞춘다(dynamic sizing). 고정 높이로 두면 내용이 짧을 때
// 아래에 빈 공간이 남고, 바닥에 붙어야 하는 요소(취소)를 내리려 해도 `BottomSheetView`가
// `position: absolute`라 flex 배치가 먹지 않는다. 내용에 맞추면 마지막 요소가 곧 시트의 바닥이다.
// 내용이 최대 높이를 넘으면 그때는 스크롤된다.
export const AppSheet = forwardRef<AppSheetRef, AppSheetProps>(function AppSheet(
  { children, footer },
  ref,
) {
  const modalRef = useRef<BottomSheetModal>(null);
  // 열려 있어야 하는 상태인지. 아래 handleContentLayout의 보정이 닫히는 중에 시트를
  // 도로 열지 않도록 present/dismiss 시점을 기억한다.
  const presentedRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        presentedRef.current = true;
        modalRef.current?.present();
      },
      close: () => {
        presentedRef.current = false;
        modalRef.current?.dismiss();
      },
    }),
    [],
  );

  // dynamic sizing은 present 시점에 콘텐츠 높이 측정이 안 끝나 있으면 시트가 닫힘 위치에
  // 그대로 머무는 레이스가 있다(gorhom/react-native-bottom-sheet#2126 — 5.2.14 기준 미해결).
  // 측정이 끝난 시점(onLayout)에 열림 위치로 한 번 더 보내서 보정한다. 이미 열려 있으면
  // 같은 자리라 no-op이고, 닫히는 중에는 presentedRef가 꺼져 있어 아무것도 안 한다.
  const handleContentLayout = () => {
    if (presentedRef.current) modalRef.current?.snapToIndex(0);
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  // bottomInset은 푸터를 홈 인디케이터 위로 띄운다 — 내용 쪽 여백과 별개로 푸터가 직접 받아야 한다.
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        {footer}
      </BottomSheetFooter>
    ),
    [footer, insets.bottom],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      // 백드롭 탭·아래로 끌기처럼 close()를 거치지 않는 닫힘도 presentedRef를 꺼야 한다.
      onDismiss={() => {
        presentedRef.current = false;
      }}
      maxDynamicContentSize={height * MAX_HEIGHT_RATIO}
      backdropComponent={renderBackdrop}
      footerComponent={footer ? renderFooter : undefined}
      enablePanDownToClose
      // className을 못 받는 라이브러리 prop이라 style로 준다. 값은 시안 확정값:
      // 상단 라운드 20(borderRadius 토큰 5), 핸들 48x4(background.assistive).
      backgroundStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      handleIndicatorStyle={{
        width: 48,
        height: 4,
        backgroundColor: colors.background.assistive,
      }}
    >
      {/* 내용이 최대 높이를 넘칠 때를 대비해 View가 아니라 ScrollView로 받는다.
          dynamic sizing은 이 안의 내용 높이를 재서 시트 높이를 정한다.
          enableFooterMarginAdjustment가 푸터 높이만큼 아래 여백을 넣어줘서
          마지막 항목이 푸터에 가리지 않는다. */}
      <BottomSheetScrollView
        enableFooterMarginAdjustment
        contentContainerStyle={{ paddingBottom: insets.bottom }}
      >
        <View onLayout={handleContentLayout}>{children}</View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
