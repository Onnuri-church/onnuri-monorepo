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

// 드롭다운 항목 높이와 목록 최대 높이 — 12개월(36*12)이 스크롤 없이 한 번에 펼쳐지는 높이다.
// 작은 화면에서 이보다 길어지면 안에서 스크롤된다.
const ITEM_HEIGHT = 36;
const LIST_MAX_HEIGHT = 440;
// 칩 모서리 반지름 — 펼친 카드도 같은 값을 써서 버튼에서 이어 늘어난 모양이 된다.
const RADIUS = 18;

// 필터 칩 모양의 선택 버튼 — 누르면 그 버튼 자리에서 목록까지 한 덩어리로 아래로 늘어난다
// (2026-10-07 피드백: 버튼과 목록이 떨어져 떠 있으면 안 예쁘다). 버튼을 실측해 같은 자리·같은
// 폭·같은 테두리로 카드를 덮어 그리고, 칩 줄 아래에 목록을 이어 붙인다. 화면 단위가 아닌
// 앵커 팝오버라 RN Modal로 띄운다 (DESIGN.md 오버레이 예외 조항).
// 현재 선택 항목은 브랜드 색 + 굵게 표시한다.
export function PickerPill<T extends number | string>({
  label,
  options,
  selected,
  onSelect,
}: PickerPillProps<T>) {
  const buttonRef = useRef<View>(null);
  // 목록을 붙일 화면 좌표. null이면 닫힘 — 버튼을 실측한 뒤에 열리므로 위치와 열림이 같이 간다.
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const handleOpenPress = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y, left: x, width, height });
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
            // 바깥 Pressable의 닫기 탭이 카드 안으로 새지 않게 카드도 Pressable로 감싼다.
            <Pressable
              className="absolute overflow-hidden border border-text-assistive bg-background-normal"
              style={{
                top: anchor.top,
                left: anchor.left,
                width: anchor.width,
                borderRadius: RADIUS,
              }}
              onPress={handleClose}
            >
              {/* 눌렀던 칩과 똑같은 줄 — 누르면 닫힌다 */}
              <View
                className="flex-row items-center gap-0.5 pl-3 pr-1.5"
                style={{ height: anchor.height - 2 }}
              >
                <Text className="text-label-medium text-text-neutral">{label}</Text>
                <Icon name="arrow-drop-down" size={18} color={colors.icon.accent} />
              </View>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: LIST_MAX_HEIGHT }}
              >
                {options.map((option) => (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => handleSelect(option.value)}
                    className="items-center justify-center active:opacity-60"
                    style={{ height: ITEM_HEIGHT }}
                  >
                    <Text
                      className={
                        option.value === selected
                          ? "text-label-medium text-primary-normal"
                          : "text-label-medium text-text-neutral"
                      }
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
}
