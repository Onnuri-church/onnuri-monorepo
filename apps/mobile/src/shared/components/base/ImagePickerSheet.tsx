import type { RefObject } from "react";
import { Pressable, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "./AppSheet";

interface ImagePickerSheetProps {
  sheetRef: RefObject<AppSheetRef | null>;
  pickerItems: readonly (readonly [string, () => void])[];
}

export function ImagePickerSheet({ sheetRef, pickerItems }: ImagePickerSheetProps) {
  const handleCancelPress = () => sheetRef.current?.close();

  return (
    <AppSheet
      ref={sheetRef}
      footer={
        <View className="bg-background-normal px-4 pb-4">
          <View className="border-t-2 border-background-assistive" />
          <Pressable
            onPress={handleCancelPress}
            className="pt-4"
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="text-center text-body-medium text-text-alternative">취소</Text>
          </Pressable>
        </View>
      }
    >
      <View className="gap-6 p-4 py-9">
        {pickerItems.map(([menuLabel, onPress]) => (
          <Pressable
            key={menuLabel}
            onPress={onPress}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="text-center text-body-medium text-text-normal">{menuLabel}</Text>
          </Pressable>
        ))}
      </View>
    </AppSheet>
  );
}
