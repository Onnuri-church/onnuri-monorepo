import { Pressable, Text, View } from "react-native";

const MONTH_ROWS = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
];

interface MonthPickerProps {
  /** 선택된 달(1~12). "전체 기간"이 선택된 상태면 null. */
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
  /** "전체 기간" 버튼 동작. 안 주면 버튼을 그리지 않는다 (출석 관리처럼 특정 주가 필요한 곳). */
  onSelectAll?: () => void;
}

// 1~12월 선택 그리드 (시안: 52px 원형 알약 4열 × 3행 + 상단 "전체 기간" 점선 버튼).
// 출석 관리의 주차별 보기와 팔로워 노트 게시판의 달력이 같은 그리드를 쓴다.
export function MonthPicker({ selectedMonth, onSelectMonth, onSelectAll }: MonthPickerProps) {
  return (
    <View className="gap-5">
      {onSelectAll && (
        <Pressable
          className="h-12 items-center justify-center rounded-5 border-2 border-dashed border-background-assistive"
          onPress={onSelectAll}
        >
          <Text
            className={
              selectedMonth === null
                ? "text-body-main text-text-normal"
                : "text-body-main text-text-alternative"
            }
          >
            전체 기간
          </Text>
        </Pressable>
      )}
      {MONTH_ROWS.map((row) => (
        <View key={row[0]} className="flex-row justify-between px-5">
          {row.map((month) => {
            const selected = month === selectedMonth;
            return (
              <Pressable
                key={month}
                className={`h-13 w-13 items-center justify-center rounded-full ${
                  selected ? "bg-primary-normal" : "bg-background-muted"
                }`}
                onPress={() => onSelectMonth(month)}
              >
                <Text
                  className={`text-body-main ${selected ? "text-text-disable" : "text-text-normal"}`}
                >
                  {month}월
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
