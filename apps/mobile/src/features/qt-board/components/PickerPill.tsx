import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

interface PickerPillProps<T extends number | string> {
  /** 버튼에 보이는 현재 값 (예: "2026년") */
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

// 드롭다운 항목 높이와 최대 높이 — 12개월(40*12 + 위아래 여백 16)이 스크롤 없이 한 번에
// 펼쳐지는 높이다. 작은 화면에서 이보다 길어지면 안에서 스크롤된다.
const ITEM_HEIGHT = 40;
const MAX_HEIGHT = 500;
const MIN_WIDTH = 96;
const GAP_BELOW_BUTTON = 6;

// 필터 칩 모양의 선택 버튼 — 누르면 그 버튼 바로 아래로 목록이 펼쳐진다 (2026-10-07 피드백:
// 바텀시트가 아니라 토글 드롭다운). ⋮ 메뉴(ContextMenu)처럼 버튼을 실측해서 아래에 붙이고,
// 화면 단위가 아닌 앵커 팝오버라 RN Modal로 띄운다 (DESIGN.md 오버레이 예외 조항).
// 현재 선택 항목은 브랜드 색 + 굵게 표시한다.
export function PickerPill<T extends number | string>({
  label,
  options,
  selected,
  onSelect,
}: PickerPillProps<T>) {
  const buttonRef = useRef<View>(null);
  // 목록을 붙일 화면 좌표. null이면 닫힘 — 버튼을 실측한 뒤에 열리므로 위치와 열림이 같이 간다.
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);

  const handleOpenPress = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height + GAP_BELOW_BUTTON, left: x, width });
    });
  };

  const handleClose = () => setAnchor(null);

  const handleSelect = (value: T) => {
    setAnchor(null);
    onSelect(value);
  };

  return (
    <>
      <Pressable
        ref={buttonRef}
        onPress={handleOpenPress}
        className="flex-row items-center gap-0.5 rounded-full border border-text-assistive py-1 pl-3 pr-1.5"
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Text className="text-label-medium text-text-neutral">{label}</Text>
        <Icon name="arrow-drop-down" size={18} color={colors.icon.accent} />
      </Pressable>

      <Modal visible={anchor !== null} transparent animationType="fade" onRequestClose={handleClose}>
        {/* 바깥 아무 곳이나 누르면 닫힌다. 안드로이드 뒤로가기는 onRequestClose가 받는다. */}
        <Pressable className="flex-1" onPress={handleClose}>
          {anchor && (
            <View
              className="absolute overflow-hidden rounded-5 bg-background-muted py-2"
              style={{
                top: anchor.top,
                left: anchor.left,
                minWidth: Math.max(anchor.width, MIN_WIDTH),
                maxHeight: MAX_HEIGHT,
              }}
            >
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {options.map((option) => (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => handleSelect(option.value)}
                    className="items-center justify-center px-4 active:opacity-60"
                    style={{ height: ITEM_HEIGHT }}
                  >
                    <Text
                      className={
                        option.value === selected
                          ? "text-body-main text-primary-normal"
                          : "text-body-medium text-text-normal"
                      }
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}
