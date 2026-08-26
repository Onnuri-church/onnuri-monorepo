import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import {
  formatSundayLabel,
  getInitialAttendance,
  getLatestSunday,
  getSundaysOfMonth,
  type AttendanceStatus,
  type MemberAttendance,
} from "./attendance";
import { findCell } from "./cells";
import { AttendanceMemberRow } from "./components/AttendanceMemberRow";
import { MonthPicker } from "./components/MonthPicker";

// 출석 관리 (관리 탭 > 출석 관리 — 셀장·관리자 전용 경로로만 진입한다).
// 날짜 바를 누르면 주차별 보기(월 그리드 + 그 달의 일요일 목록)가 아래로 펼쳐진다 (시안).
export function CellAttendanceScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "CellAttendance">>();
  const { cellId } = route.params;
  const cell = findCell(cellId);

  const [selectedDate, setSelectedDate] = useState(() => getLatestSunday(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(selectedDate.getMonth() + 1);
  // TODO(API): 날짜별 출석 조회·저장 연동 전 — 화면 로컬 상태로만 동작한다.
  const [attendance, setAttendance] = useState<MemberAttendance[]>(() =>
    getInitialAttendance(cellId),
  );

  const worshipCount = attendance.filter((row) => row.worship === "present").length;
  const meetingCount = attendance.filter((row) => row.meeting === "present").length;

  const handleStatusChange =
    (memberId: string, field: "worship" | "meeting") => (status: AttendanceStatus) =>
      setAttendance((prev) =>
        prev.map((row) => (row.memberId === memberId ? { ...row, [field]: status } : row)),
      );

  const handleSundaySelect = (date: Date) => {
    setSelectedDate(date);
    setPickerOpen(false);
  };

  const handleSubmitPress = () => {
    // TODO(API): 출석 저장 연동 전 — 입력까지만 동작한다.
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        {/* 날짜 선택 바 — 누르면 주차별 보기 펼침/접힘 */}
        <Pressable
          className="h-11 flex-row items-center justify-center rounded-2.5 bg-background-muted"
          onPress={() => setPickerOpen((prev) => !prev)}
        >
          <Text className="text-body-main text-text-normal">{formatSundayLabel(selectedDate)}</Text>
          <View className="absolute right-4">
            <Icon name="arrow-drop-down" size={14} color={colors.icon.normal} />
          </View>
        </Pressable>

        {pickerOpen && (
          <View className="mt-4 gap-4">
            <MonthPicker selectedMonth={pickerMonth} onSelectMonth={setPickerMonth} />
            <View className="rounded-5 border border-background-assistive">
              {getSundaysOfMonth(selectedDate.getFullYear(), pickerMonth).map(
                (sunday, index, sundays) => (
                  <Pressable
                    key={sunday.toISOString()}
                    className={`h-11 items-center justify-center ${
                      index < sundays.length - 1 ? "border-b border-background-assistive" : ""
                    }`}
                    onPress={() => handleSundaySelect(sunday)}
                  >
                    <Text className="text-body-main text-text-normal">
                      {formatSundayLabel(sunday)}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          </View>
        )}

        {/* 안내 배너 */}
        <View className="mt-3.5 rounded-2.5 bg-background-alternative px-4 py-2.5">
          <Text className="text-caption-main text-primary-normal">
            QR로 예배 출석하면 셀모임 참석까지 자동으로 체크돼요.{"\n"}실제와 다른 사람만 눌러서
            정정해주세요.
          </Text>
        </View>

        <Text className="mt-4 text-center text-caption-main text-text-alternative">
          예배 {worshipCount}명 출석 · 셀모임 {meetingCount}명 참석 · {cell?.name ?? "셀"}{" "}
          {attendance.length}명 기준
        </Text>

        <View className="mt-2">
          {attendance.map((row, index) => (
            <View
              key={row.memberId}
              style={
                index < attendance.length - 1
                  ? {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.background.assistive,
                    }
                  : undefined
              }
            >
              <AttendanceMemberRow
                attendance={row}
                onWorshipChange={handleStatusChange(row.memberId, "worship")}
                onMeetingChange={handleStatusChange(row.memberId, "meeting")}
              />
            </View>
          ))}
        </View>

        <View className="mt-6">
          <Button label="등록하기" onPress={handleSubmitPress} />
        </View>
      </ScrollView>
    </View>
  );
}
