import { useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../../../shared/components/base/AppSheet";
import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

interface SelectFieldProps {
  label: string;
  placeholder: string;
  options: string[];
  value: string | null;
  onChange: (option: string) => void;
}

// 라벨 + 선택값 줄. 누르면 액션 시트가 올라오고, 항목을 고르거나 취소하면 닫힌다.
// 시안 확정값(402pt 프레임): 입력줄 48 높이 / 좌우 8 / 아래 구분선.
// 구분선은 시안이 1.5px이지만 Tailwind 기본 스케일에 없어서 1px(border)로 넣었다.
export function SelectField({ label, placeholder, options, value, onChange }: SelectFieldProps) {
  const sheetRef = useRef<AppSheetRef>(null);

  const handleSelect = (option: string) => {
    onChange(option);
    sheetRef.current?.close();
  };

  return (
    <View className="py-4">
      <Text className="text-body-main text-text-normal">{label}</Text>

      {/* 눌림 상태는 prop이 아니라 Pressable 콜백으로 처리한다 (DESIGN.md props 규칙). */}
      <Pressable
        onPress={() => sheetRef.current?.open()}
        className="mt-1 h-12 flex-row items-center justify-between border-b border-background-assistive px-2"
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Text
          className={
            value ? "text-heading-small text-text-normal" : "text-heading-small text-text-assistive"
          }
        >
          {value ?? placeholder}
        </Text>
        <Icon name="arrow-drop-down" color={colors.icon.accent} />
      </Pressable>

      {/* 시안 확정값: 바깥 여백 16 / 항목 간격 24 / 목록-취소 사이 37(기본 스케일에 없어서 36으로 넣었다).
          취소는 목록과 같이 스크롤되지 않고 시트 바닥에 고정돼야 해서 footer로 넘긴다.
          목록 뒤로 지나가므로 배경(bg-background-normal)을 칠해야 비치지 않는다. */}
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
              key={option}
              onPress={() => handleSelect(option)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-center text-body-medium text-text-normal">{option}</Text>
            </Pressable>
          ))}
        </View>
      </AppSheet>
    </View>
  );
}
