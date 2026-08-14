import { ScrollView } from "react-native";

import { FilterChip } from "./FilterChip";

interface FilterBarProps<T extends string> {
  items: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

// 목록 상단의 필터 줄. 항목이 화면을 넘치면 가로로 스크롤된다(주차 목록처럼 개수가 많은 경우).
// RN ScrollView는 자기 자신에 flexGrow: 1, flexShrink: 1을 기본으로 붙인다.
// grow-0이 없으면 세로 공간을 전부 먹고, shrink-0이 없으면 아래 목록 ScrollView에 눌려
// 칩이 납작해진다. 둘 다 있어야 한다.
export function FilterBar<T extends string>({ items, selected, onSelect }: FilterBarProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0 shrink-0"
      contentContainerClassName="flex-row gap-2 p-4"
    >
      {items.map(({ value, label }) => (
        <FilterChip
          key={value}
          label={label}
          selected={selected === value}
          onPress={() => onSelect(value)}
        />
      ))}
    </ScrollView>
  );
}
