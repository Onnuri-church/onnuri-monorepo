import type { AdminOffDay, OffDayConflictBody, OffDayKind } from "@onnuri/shared";
import axios from "axios";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import { MonthPicker } from "../cell/components/MonthPicker";
import { useAdminOffDays, useSetAdminOffDay } from "./api";

const KIND_LABEL: Record<OffDayKind, string> = {
  WORSHIP_OFF: "예배 없음",
  CELL_MEETING_OFF: "셀모임 없음",
  BOTH_OFF: "예배·셀모임 없음",
};

// 시트 선택지 — 맨 위가 지정 해제(모임 있는 날)다.
const OPTIONS: { kind: OffDayKind | null; label: string }[] = [
  { kind: null, label: "모임 있음 (지정 안 함)" },
  { kind: "WORSHIP_OFF", label: KIND_LABEL.WORSHIP_OFF },
  { kind: "CELL_MEETING_OFF", label: KIND_LABEL.CELL_MEETING_OFF },
  { kind: "BOTH_OFF", label: KIND_LABEL.BOTH_OFF },
];

// 출석부 > 모임 없는 날 지정 — 일요일마다 예배/셀모임이 없는 날을 지정한다. 지정한 쪽은 출석부에서
// "-"로 보이고, 셀 출석 관리·QR 출석이 그 날은 받지 않는다. 지정 안 한 날은 둘 다 있는 날이다.
export function AdminOffDaysScreen() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [target, setTarget] = useState<AdminOffDay | null>(null);
  const sheetRef = useRef<AppSheetRef>(null);

  const monthParam = `${today.getFullYear()}-${String(month).padStart(2, "0")}`;
  const { data, isLoading } = useAdminOffDays(monthParam);
  const setOffDay = useSetAdminOffDay();

  const apply = (date: string, kind: OffDayKind | null, confirm?: boolean) => {
    setOffDay.mutate(
      { date, kind, confirm },
      {
        onError: (error) => {
          // 지울 기존 출석 기록이 있으면 서버가 409로 건수를 알려준다 — 확인받고 다시 보낸다.
          if (axios.isAxiosError<OffDayConflictBody>(error) && error.response?.status === 409) {
            const { worshipCount, cellMeetingCount } = error.response.data;
            const lines = [
              worshipCount > 0 ? `예배 출석 ${worshipCount}명` : null,
              cellMeetingCount > 0 ? `셀모임 출석 ${cellMeetingCount}명` : null,
            ].filter(Boolean);
            Alert.alert(
              "기존 출석 기록이 있어요",
              `${lines.join(", ")} 기록이 있어요.\n그래도 ${kind ? KIND_LABEL[kind] : ""}(으)로 지정하면 이 기록이 삭제되고 되돌릴 수 없어요.`,
              [
                { text: "취소", style: "cancel" },
                {
                  text: "삭제하고 지정",
                  style: "destructive",
                  onPress: () => apply(date, kind, true),
                },
              ],
            );
            return;
          }
          Alert.alert("저장 실패", "잠시 후 다시 시도해주세요.");
        },
      },
    );
  };

  const handleOptionSelect = (kind: OffDayKind | null) => {
    sheetRef.current?.close();
    if (target && kind !== target.kind) apply(target.date, kind);
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <View className="rounded-2.5 bg-background-alternative px-4 py-2.5">
          <Text className="text-caption-main text-primary-normal">
            지정하지 않은 일요일은 예배와 셀모임이 모두 있는 날이에요.{"\n"}지정하면 그 날의 해당
            출석 기록은 삭제돼요.
          </Text>
        </View>

        {/* 달 선택 — 출석부 날짜 바와 같은 형태 */}
        <Pressable
          className="mt-4 h-11 flex-row items-center justify-between rounded-2.5 bg-background-muted px-4"
          onPress={() => setMonthPickerOpen((prev) => !prev)}
        >
          <Text className="text-body-main text-text-normal">
            {data?.monthLabel ?? `${today.getFullYear()}년 ${month}월`}
          </Text>
          <Icon name="arrow-drop-down" size={16} color={colors.icon.strongest} />
        </Pressable>
        {monthPickerOpen && (
          <View className="mt-4">
            <MonthPicker
              selectedMonth={month}
              onSelectMonth={(next) => {
                setMonth(next);
                setMonthPickerOpen(false);
              }}
            />
          </View>
        )}

        <View className="mt-4">
          {(data?.days ?? []).map((day, index) => (
            <Pressable
              key={day.date}
              className="h-14 flex-row items-center justify-between"
              style={({ pressed }) => [
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.background.muted },
                pressed ? { opacity: 0.6 } : null,
              ]}
              onPress={() => {
                setTarget(day);
                sheetRef.current?.open();
              }}
            >
              <Text className="text-body-main text-text-normal">{day.label} (일)</Text>
              <View className="flex-row items-center gap-2">
                <Text
                  className={
                    day.kind
                      ? "text-body-main text-primary-normal"
                      : "text-body-regular text-text-alternative"
                  }
                >
                  {day.kind ? KIND_LABEL[day.kind] : "모임 있음"}
                </Text>
                <Icon name="expand-right" size={14} color={colors.icon.normal} />
              </View>
            </Pressable>
          ))}
          {!data && (
            <Text className="pt-10 text-center text-body-medium text-text-alternative">
              {isLoading ? "불러오고 있어요." : "일요일 목록을 불러오지 못했어요."}
            </Text>
          )}
        </View>
      </ScrollView>

      <AppSheet
        ref={sheetRef}
        footer={
          <Pressable
            className="items-center bg-background-normal py-4"
            onPress={() => sheetRef.current?.close()}
          >
            <Text className="text-body-regular text-text-alternative">취소</Text>
          </Pressable>
        }
      >
        <View className="px-6 pb-2 pt-1">
          <Text className="pb-2 text-caption-main text-text-alternative">
            {target ? `${target.label} (일)` : ""}
          </Text>
          {OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              className="py-3"
              onPress={() => handleOptionSelect(option.kind)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text
                className={
                  option.kind === (target?.kind ?? null)
                    ? "text-body-main text-primary-normal"
                    : "text-body-regular text-text-normal"
                }
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppSheet>
    </View>
  );
}
