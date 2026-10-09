import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { toDateString } from "../../shared/components/composed/DateField";
import { colors } from "../../shared/theme/tokens";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import {
  formatSundayLabel,
  getLatestSunday,
  getSundaysOfMonth,
  type AttendanceStatus,
  type MemberAttendance,
} from "./attendance";
import { useCell, useCellAttendance, useSaveCellAttendance } from "./api";
import { AttendanceMemberRow } from "./components/AttendanceMemberRow";
import { MonthPicker } from "./components/MonthPicker";

// 출석 관리 (관리 탭 > 출석 관리 — 셀장·관리자 전용 경로로만 진입한다).
// 날짜 바를 누르면 주차별 보기(월 그리드 + 그 달의 일요일 목록)가 아래로 펼쳐진다 (시안).
export function CellAttendanceScreen() {
  const { t } = useTranslation();
  const OFF_DAY_NOTICE = {
    WORSHIP_OFF: t("이 날은 예배가 없는 날이에요.\n예배 출석은 저장되지 않아요."),
    CELL_MEETING_OFF: t("이 날은 셀모임이 없는 날이에요.\n셀모임 출석은 저장되지 않아요."),
    BOTH_OFF: t("이 날은 예배와 셀모임이 모두 없는 날이에요.\n출석을 저장할 수 없어요."),
  };
  const themeColors = useThemeColors();
  const route = useRoute<RouteProp<RootStackParamList, "CellAttendance">>();
  const { cellId } = route.params;
  const cell = useCell(cellId);

  const [selectedDate, setSelectedDate] = useState(() => getLatestSunday(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(selectedDate.getMonth() + 1);
  // 명단·현재 출석 상태는 서버에서 온다 (예배 = QR 기록 + 수동 정정 결과, 셀모임 = 기본 결석).
  // 토글은 로컬로 고치고 등록하기가 일괄 저장한다 (시안 흐름).
  const { data: attendanceData } = useCellAttendance(cellId, toDateString(selectedDate));
  const saveAttendance = useSaveCellAttendance(cellId);
  const [attendance, setAttendance] = useState<MemberAttendance[]>([]);
  useEffect(() => {
    if (attendanceData) {
      setAttendance(
        attendanceData.members.map((member) => ({
          memberId: member.id,
          name: member.name,
          avatarUrl: member.avatarUrl,
          worship: member.worship ? "present" : "absent",
          meeting: member.meeting ? "present" : "absent",
        })),
      );
    }
  }, [attendanceData]);

  const offDay = attendanceData?.offDay ?? null;

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
    if (saveAttendance.isPending) return;
    saveAttendance.mutate(
      {
        date: toDateString(selectedDate),
        records: attendance.map((row) => ({
          userId: row.memberId,
          worship: row.worship === "present",
          meeting: row.meeting === "present",
        })),
      },
      {
        onSuccess: () => Alert.alert(t("저장 완료"), t("출석이 저장됐어요.")),
        onError: () => Alert.alert(t("저장 실패"), t("잠시 후 다시 시도해주세요.")),
      },
    );
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

        {/* 안내 배너 — 관리자가 모임 없는 날로 지정했으면 그 사실을 알린다 */}
        <View className="mt-3.5 rounded-2.5 bg-background-alternative px-4 py-2.5">
          <Text className="text-caption-main text-primary-normal">
            {offDay
              ? OFF_DAY_NOTICE[offDay]
              : t("QR은 예배 출석만 기록돼요.\n셀모임에 온 사람은 아래에서 직접 체크해주세요.")}
          </Text>
        </View>

        <Text className="mt-4 text-center text-caption-main text-text-alternative">
          {t("예배 {{worship}}명 출석 · 셀모임 {{meeting}}명 참석 · {{cell}} {{count}}명 기준", {
            worship: worshipCount,
            meeting: meetingCount,
            cell: cell?.name ?? t("셀"),
            count: attendance.length,
          })}
        </Text>

        <View className="mt-2">
          {attendance.map((row, index) => (
            <View
              key={row.memberId}
              style={
                index < attendance.length - 1
                  ? {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: themeColors.background.assistive,
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
          <Button label={t("등록하기")} onPress={handleSubmitPress} disabled={offDay === "BOTH_OFF"} />
        </View>
      </ScrollView>
    </View>
  );
}
