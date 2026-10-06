import { useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../../../shared/components/base/AppSheet";
import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

interface PickerPillProps<T extends number | string> {
  /** 버튼에 보이는 현재 값 (예: "2026년") */
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

// 필터 칩 모양의 선택 버튼 — 누르면 항목 시트가 올라오고, 고르면 닫힌다.
// SelectField의 시트 구성(항목 목록 + 바닥 고정 취소)과 같되 폼 줄이 아니라 칩이다.
// 현재 선택 항목은 브랜드 색 + 굵게 표시한다.
export function PickerPill<T extends number | string>({
  label,
  options,
  selected,
  onSelect,
}: PickerPillProps<T>) {
  const sheetRef = useRef<AppSheetRef>(null);

  const handleSelect = (value: T) => {
    onSelect(value);
    sheetRef.current?.close();
  };

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.open()}
        className="flex-row items-center gap-0.5 rounded-full border border-text-assistive py-1 pl-3 pr-1.5"
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Text className="text-label-medium text-text-neutral">{label}</Text>
        <Icon name="arrow-drop-down" size={18} color={colors.icon.accent} />
      </Pressable>

      <AppSheet
        ref={sheetRef}
        footer={
          <View className="bg-background-normal px-4 pb-4">
            <View className="border-t-2 border-background-assistive" />
            <Pressable
              onPress={() => sheetRef.current?.close()}
              className="pt-4"
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-center text-body-medium text-text-alternative">취소</Text>
            </Pressable>
          </View>
        }
      >
        <View className="gap-6 p-4 pb-9">
          {options.map((option) => (
            <Pressable
              key={String(option.value)}
              onPress={() => handleSelect(option.value)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text
                className={
                  option.value === selected
                    ? "text-center text-body-main text-primary-normal"
                    : "text-center text-body-medium text-text-normal"
                }
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppSheet>
    </>
  );
}
