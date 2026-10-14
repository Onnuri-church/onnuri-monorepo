import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "../base/Icon";
import { colors } from "../../theme/tokens";

interface PickerPillProps<T extends number | string> {
  /** 버튼에 보이는 현재 값 (예: "2026년") */
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

// 드롭다운은 5개만 보이고 나머지는 안에서 위아래로 스크롤한다 (2026-10-07 결정 — 12개월이
// 전부 펼쳐지면 화면을 너무 차지한다).
const ITEM_HEIGHT = 36;
const VISIBLE_COUNT = 5;
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

  // 열릴 때 선택 항목이 5개 창 가운데쯤 오게 미리 스크롤한다 — 안 그러면 선택값이 창 밖에 있어
  // 지금 무엇이 골라져 있는지 안 보인다.
  const listRef = useRef<ScrollView>(null);
  const handleListLayout = () => {
    const index = options.findIndex((option) => option.value === selected);
    const centered = (index - Math.floor(VISIBLE_COUNT / 2)) * ITEM_HEIGHT;
    listRef.current?.scrollTo({ y: Math.max(0, centered), animated: false });
  };

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
                {/* 열린 상태라 화살표가 위를 본다 (닫힌 칩은 아래) */}
                <View style={{ transform: [{ rotate: "180deg" }] }}>
                  <Icon name="arrow-drop-down" size={18} color={colors.icon.accent} />
                </View>
              </View>
              <ScrollView
                ref={listRef}
                onLayout={handleListLayout}
                bounces={false}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: ITEM_HEIGHT * VISIBLE_COUNT }}
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
