import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../base/AppSheet";
import { Field } from "../base/Field";
import { Icon } from "../base/Icon";
import { colors } from "../../theme/tokens";

interface DateFieldProps {
  label: string;
  placeholder: string;
  /** YYYY-MM-DD. 표시 포맷이 정해지면 표시용 변환을 여기서 처리한다. */
  value: string | null;
  onChange: (date: string) => void;
}

// new Date("YYYY-MM-DD")는 UTC로 해석돼 타임존에 따라 하루 밀릴 수 있어서 직접 쪼갠다.
function parseDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

// 라벨 + 선택값 줄. 누르면 OS 기본 날짜 선택 UI가 뜬다 — 안드로이드는 자체 다이얼로그라
// 시트가 필요 없고, iOS는 인라인 달력 뷰라 AppSheet에 담아 바텀시트로 올린다.
// 트리거 줄의 스타일은 profile/SelectField와 같은 시안(입력줄 48 / 좌우 8 / 아래 구분선)이다.
export function DateField({ label, placeholder, value, onChange }: DateFieldProps) {
  const sheetRef = useRef<AppSheetRef>(null);

  // 아직 고른 날짜가 없으면 오늘부터 시작한다.
  const pickerValue = value ? parseDateString(value) : new Date();

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== "set" || !date) return;
    onChange(toDateString(date));
    if (Platform.OS === "ios") sheetRef.current?.close();
  };

  const handleFieldPress = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: "date",
        onChange: handleDateChange,
      });
    } else {
      sheetRef.current?.open();
    }
  };

  return (
    <View className="py-4">
      <Field label={label}>
        <Pressable
          onPress={handleFieldPress}
          className="h-12 flex-row items-center justify-between border-b border-background-assistive px-2"
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Text
            className={
              value
                ? "text-heading-small text-text-normal"
                : "text-heading-small text-text-assistive"
            }
          >
            {value ?? placeholder}
          </Text>
          <Icon name="arrow-drop-down" color={colors.icon.accent} />
        </Pressable>
      </Field>

      {Platform.OS === "ios" && (
        <AppSheet ref={sheetRef}>
          <View className="px-4 py-2">
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display="inline"
              onChange={handleDateChange}
            />
          </View>
        </AppSheet>
      )}
    </View>
  );
}
