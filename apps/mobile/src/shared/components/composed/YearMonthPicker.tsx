import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { PickerPill } from "./PickerPill";

interface YearMonthPickerProps {
  /** 서버가 내려준 선택 가능한 달 — value는 "2026.08" 형식, 최신순이다. */
  months: { value: string }[];
  /** 지금 선택된 달 ("2026.08"). */
  selected: string;
  /** 고른 달을 "YYYY.MM"으로 돌려준다. */
  onSelect: (value: string) => void;
}

// 연도·월을 따로 고르는 토글 한 쌍 (큐티나눔과 같은 모양, 5개까지 보이고 안에서 스크롤).
// 말씀·주보처럼 서버가 "글이 있는 달" 목록만 주는 화면용이라, 월 선택지는 고른 연도에 글이 있는
// 달만 나온다. 연도를 바꾸면 그 해의 가장 최근 달로 간다.
export function YearMonthPicker({ months, selected, onSelect }: YearMonthPickerProps) {
  const { t } = useTranslation();
  const [selectedYear, selectedMonth] = selected.split(".");

  const years = Array.from(new Set(months.map((item) => item.value.split(".")[0])));
  const monthsOfYear = months
    .filter((item) => item.value.startsWith(`${selectedYear}.`))
    .map((item) => item.value.split(".")[1]);

  return (
    <View className="flex-row items-center gap-2">
      <PickerPill
        label={t("{{year}}년", { year: selectedYear })}
        options={years.map((year) => ({ value: year, label: t("{{year}}년", { year }) }))}
        selected={selectedYear}
        onSelect={(year) => {
          const latestOfYear = months.find((item) => item.value.startsWith(`${year}.`));
          if (latestOfYear) onSelect(latestOfYear.value);
        }}
      />
      <PickerPill
        label={t("{{month}}월", { month: Number(selectedMonth) })}
        options={monthsOfYear.map((month) => ({
          value: month,
          label: t("{{month}}월", { month: Number(month) }),
        }))}
        selected={selectedMonth}
        onSelect={(month) => onSelect(`${selectedYear}.${month}`)}
      />
    </View>
  );
}
