import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { PickerPill } from "./PickerPill";

// 앱을 쓰기 시작한 해 — 연도 선택지는 이 해부터 올해(+ futureYears)까지 해가 바뀌면 저절로 늘어난다.
const FIRST_YEAR = 2026;

interface CalendarYearMonthPickerProps {
  year: number;
  /** 1~12 */
  month: number;
  onChange: (year: number, month: number) => void;
  /** 올해 뒤로 몇 해를 더 고를 수 있게 할지 — 모임 없는 날처럼 미리 지정하는 화면은 1 */
  futureYears?: number;
}

// 연도·월을 따로 고르는 토글 한 쌍 (말씀·주보·공지의 YearMonthPicker와 같은 모양).
// 출석부·모임 없는 날처럼 "글이 있는 달" 목록 없이 달력 그대로 고르는 화면용이다.
// 연도 목록은 최신 해가 위에 오고, 월은 1~12월 전부 고를 수 있다.
export function CalendarYearMonthPicker({
  year,
  month,
  onChange,
  futureYears = 0,
}: CalendarYearMonthPickerProps) {
  const { t } = useTranslation();
  const lastYear = new Date().getFullYear() + futureYears;
  const years: number[] = [];
  for (let value = Math.max(lastYear, year); value >= Math.min(FIRST_YEAR, year); value -= 1) {
    years.push(value);
  }

  return (
    <View className="flex-row items-center gap-2">
      <PickerPill
        label={t("{{year}}년", { year })}
        options={years.map((value) => ({ value, label: t("{{year}}년", { year: value }) }))}
        selected={year}
        onSelect={(next) => onChange(next, month)}
      />
      <PickerPill
        label={t("{{month}}월", { month })}
        options={Array.from({ length: 12 }, (_, index) => index + 1).map((value) => ({
          value,
          label: t("{{month}}월", { month: value }),
        }))}
        selected={month}
        onSelect={(next) => onChange(year, next)}
      />
    </View>
  );
}
