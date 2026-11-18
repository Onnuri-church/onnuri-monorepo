import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../../../shared/components/base/AppSheet";
import { Button } from "../../../shared/components/base/Button";
import { Icon } from "../../../shared/components/base/Icon";
import { toDateString } from "../../../shared/components/composed/DateField";
import { colors } from "../../../shared/theme/tokens";

interface DateRangeFieldProps {
  /** YYYY-MM-DD */
  from: string | null;
  /** YYYY-MM-DD */
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

type Side = "from" | "to";

// new Date("YYYY-MM-DD")는 UTC로 해석돼 하루 밀릴 수 있어서 직접 쪼갠다 (DateField와 같은 처리).
function parse(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDotted(value: string) {
  return value.replace(/-/g, ".");
}

// 기간 안의 일요일 수 — 출석부는 일요일마다 한 칸이라 "몇 주치"인지 바로 보이게 한다.
function countSundays(from: string, to: string) {
  const start = parse(from);
  const end = parse(to);
  const first = new Date(start);
  first.setDate(start.getDate() + ((7 - start.getDay()) % 7));
  if (first > end) return 0;
  return Math.floor((end.getTime() - first.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

// 데이터 다운로드 "직접 선택" 기간 (SCRUM-246). 시작 → 끝 두 칸을 나란히 두고 이름표를 붙인다.
// 끝은 시작 이전을 고를 수 없고, 시작을 끝보다 뒤로 옮기면 끝을 비워 다시 고르게 한다.
export function DateRangeField({ from, to, onChange }: DateRangeFieldProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<AppSheetRef>(null);
  const [side, setSide] = useState<Side>("from");

  const minimumDate = side === "to" && from ? parse(from) : undefined;
  const current = side === "from" ? from : to;
  const pickerValue = current ? parse(current) : (minimumDate ?? new Date());

  const apply = (picked: Side, date: Date) => {
    const value = toDateString(date);
    if (picked === "from") {
      onChange(value, to && to < value ? null : to);
    } else {
      onChange(from, value);
    }
  };

  const open = (picked: Side) => {
    setSide(picked);
    const min = picked === "to" && from ? parse(from) : undefined;
    const value = picked === "from" ? from : to;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: value ? parse(value) : (min ?? new Date()),
        mode: "date",
        minimumDate: min,
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type === "set" && date) apply(picked, date);
        },
      });
    } else {
      sheetRef.current?.open();
    }
  };

  const box = (picked: Side, label: string, value: string | null) => {
    const active = value !== null;
    return (
      <Pressable
        className={
          active
            ? "flex-1 rounded-2.5 border border-primary-normal bg-background-alternative px-3 py-2.5"
            : "flex-1 rounded-2.5 border border-background-assistive bg-background-normal px-3 py-2.5"
        }
        onPress={() => open(picked)}
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Text className="text-caption-small text-text-alternative">{label}</Text>
        <Text
          className={
            active
              ? "mt-0.5 text-body-main text-text-normal"
              : "mt-0.5 text-body-regular text-text-assistive"
          }
        >
          {value ? toDotted(value) : t("날짜 선택")}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        {box("from", t("시작"), from)}
        <Icon name="expand-right" size={14} color={colors.icon.normal} />
        {box("to", t("끝"), to)}
      </View>
      {from && to ? (
        <Text className="text-caption-main text-text-alternative">
          {t("{{from}} ~ {{to}} · 일요일 {{count}}번", {
            from: `${parse(from).getMonth() + 1}/${parse(from).getDate()}`,
            to: `${parse(to).getMonth() + 1}/${parse(to).getDate()}`,
            count: countSundays(from, to),
          })}
        </Text>
      ) : (
        <Text className="text-caption-main text-text-alternative">
          {from ? t("끝 날짜를 골라주세요") : t("시작 날짜부터 골라주세요")}
        </Text>
      )}

      {Platform.OS === "ios" && (
        <AppSheet ref={sheetRef}>
          <View className="px-4 py-2">
            <Text className="px-2 pb-1 text-body-main text-text-normal">
              {side === "from" ? t("시작 날짜") : t("끝 날짜")}
            </Text>
            <DateTimePicker
              value={pickerValue}
              mode="date"
              minimumDate={minimumDate}
              display="inline"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                if (event.type !== "set" || !date) return;
                apply(side, date);
                sheetRef.current?.close();
              }}
            />
            {/* 달력에 이미 표시된 날(처음엔 오늘)은 눌러도 바뀐 게 없어 선택이 안 됐다 —
                보이는 날짜 그대로 고르는 버튼을 둔다 (SCRUM-246). */}
            <View className="pt-2">
              <Button
                label={t("{{date}} 선택", { date: toDotted(toDateString(pickerValue)) })}
                onPress={() => {
                  apply(side, pickerValue);
                  sheetRef.current?.close();
                }}
              />
            </View>
          </View>
        </AppSheet>
      )}
    </View>
  );
}
