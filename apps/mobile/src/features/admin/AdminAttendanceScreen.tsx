import type { AdminAttendanceMark } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCells } from "../cell/api";
import { MonthPicker } from "../cell/components/MonthPicker";
import { fetchTeams } from "../profile/api";
import { useAdminAttendance } from "./api";
import { RadioOption } from "./components/RadioOption";

type AttendanceFilter = "all" | "cell" | "team";

// 칸 하나 — 왼쪽 예배 / 오른쪽 셀모임. O=초록, X=회색, -=대시(셀모임 없던 주).
// 시안 결석 #E4E4E4는 토큰에 없어 background.muted(#ECECEC)로 근사.
function AttendanceMarkPair({ marks }: { marks: [AdminAttendanceMark, AdminAttendanceMark] }) {
  return (
    <View className="w-12 flex-row items-center justify-center gap-1">
      {marks.map((mark, index) =>
        mark === "-" ? (
          <View key={index} className="h-0.5 w-2.5 bg-background-assistive" />
        ) : (
          <View
            key={index}
            className={
              mark === "O" ? "h-3.5 w-3.5 bg-primary-normal" : "h-3.5 w-3.5 bg-background-muted"
            }
          />
        ),
      )}
    </View>
  );
}

// 마이페이지 관리자 메뉴 > 출석부 — GET /admin/attendance 실데이터 (셀 출석 관리가 기록한
// 값을 주차 × 회원 표로 집계). 헤더의 "다운로드"는 RootNavigator 등록부에서 연결한다.
export function AdminAttendanceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const pickerSheetRef = useRef<AppSheetRef>(null);
  // 전체 필터에서 접어 둔 셀 그룹 id
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const toggleGroup = (id: string) =>
    setCollapsedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));

  // 달 선택 — 시안의 날짜 바를 누르면 월 그리드가 펼쳐진다 (출석 관리 주차별 보기와 동일 그리드).
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const monthParam = `${today.getFullYear()}-${String(month).padStart(2, "0")}`;

  // 셀/팀 선택지는 실데이터 — 아직 안 고른 상태면 첫 항목을 기본값으로 쓴다.
  const { data: cells } = useCells();
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const cellId = selectedCellId ?? cells?.[0]?.id;
  const teamId = selectedTeamId ?? teams?.[0]?.id;

  const { data, isLoading, refetch, isRefetching } = useAdminAttendance({
    month: monthParam,
    scope: filter,
    groupId: filter === "cell" ? cellId : filter === "team" ? teamId : undefined,
  });
  const dates = data?.dates ?? [];
  const groups = data?.groups ?? [];
  // 전체 보기에서는 멤버 없는 셀을 맨 아래로 모은다 ("셀 없음" 그룹은 멤버가 있을 때만 내려온다).
  const orderedGroups =
    filter === "all"
      ? [...groups.filter((g) => g.rows.length > 0), ...groups.filter((g) => g.rows.length === 0)]
      : groups;

  const pickerOptions = filter === "team" ? (teams ?? []) : (cells ?? []);
  const pickerValue =
    filter === "team"
      ? (teams?.find((team) => team.id === teamId)?.name ?? "")
      : (cells?.find((cell) => cell.id === cellId)?.name ?? "");

  const handlePickerSelect = (optionId: string) => {
    if (filter === "team") {
      setSelectedTeamId(optionId);
    } else {
      setSelectedCellId(optionId);
    }
    pickerSheetRef.current?.close();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        contentContainerClassName="px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 64 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {/* 필터 */}
        <View className="flex-row items-center gap-5">
          <RadioOption label="전체" selected={filter === "all"} onPress={() => setFilter("all")} />
          <RadioOption
            label="특정 셀"
            selected={filter === "cell"}
            onPress={() => setFilter("cell")}
          />
          <RadioOption
            label="특정 팀"
            selected={filter === "team"}
            onPress={() => setFilter("team")}
          />
        </View>

        {/* 예배·셀모임이 없는 일요일 지정 — 지정한 날은 아래 표에서 "-"로 보인다 */}
        <Pressable
          className="mt-4 flex-row items-center justify-between rounded-2.5 bg-background-alternative px-4 py-3"
          onPress={() => navigation.navigate("AdminOffDays")}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Text className="text-body-main text-primary-normal">모임 없는 날 지정</Text>
          <Icon name="expand-right" size={14} color={colors.icon.normal} />
        </Pressable>

        {/* 선택한 셀/팀 — 전체 필터에서는 없음 */}
        {filter !== "all" && (
          <Pressable
            className="mt-4 h-12 flex-row items-center justify-between rounded-2.5 bg-background-muted px-4"
            onPress={() => pickerSheetRef.current?.open()}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
          >
            <Text className="text-body-regular text-text-alternative">
              {filter === "team" ? "선택한 팀" : "선택한 셀"}
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-body-main text-primary-normal">{pickerValue}</Text>
              <Icon name="expand-right" size={14} color={colors.icon.normal} />
            </View>
          </Pressable>
        )}

        {/* 날짜 — 누르면 월 그리드 펼침 */}
        <Pressable
          className="mt-4 h-11 flex-row items-center justify-between rounded-2.5 px-4 bg-background-muted"
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

        {/* 범례 */}
        <View className="mt-4 flex-row items-center gap-2.5">
          <Text className="text-caption-main text-text-alternative">왼쪽 예배 · 오른쪽 셀모임</Text>
          <View className="ml-auto flex-row items-center gap-1">
            <View className="h-3 w-3 bg-primary-normal" />
            <Text className="text-caption-main text-text-alternative">출석</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="h-3 w-3 bg-background-muted" />
            <Text className="text-caption-main text-text-alternative">결석</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="h-0.5 w-2.5 bg-background-assistive" />
            <Text className="text-caption-main text-text-alternative">없음</Text>
          </View>
        </View>

        {/* 표 머리 */}
        <View className="mt-4 flex-row items-center pb-2">
          <Text className="flex-1 text-body-small-bold text-text-alternative">이름</Text>
          {dates.map((date) => (
            <Text
              key={date}
              numberOfLines={1}
              className="w-12 text-center text-body-small-bold text-text-alternative"
            >
              {date}
            </Text>
          ))}
        </View>
        <View className="h-px bg-background-assistive" />

        {/* 출석 표 — 전체 필터는 셀별 그룹 헤더가 붙는다 */}
        {orderedGroups.map((group, groupIndex) => {
          const isEmpty = group.rows.length === 0;
          // 셀 사이 간격 — 멤버 있는 셀은 12px, 멤버 없는 셀 묶음은 앞과 16px 띄우고 서로는 붙인다.
          const gapClass =
            groupIndex === 0
              ? ""
              : isEmpty
                ? orderedGroups[groupIndex - 1].rows.length === 0
                  ? "mt-1"
                  : "mt-4"
                : "mt-3";
          return (
            <View key={group.id} className={filter === "all" ? gapClass : ""}>
              {filter === "all" && (
                <Pressable
                  className="-mx-5 h-9 flex-row items-center justify-between bg-background-muted px-5"
                  disabled={isEmpty}
                  onPress={() => toggleGroup(group.id)}
                >
                  <Text
                    className={
                      isEmpty
                        ? "text-body-regular text-text-alternative"
                        : "text-body-main text-text-normal"
                    }
                  >
                    {group.name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-caption-main text-text-alternative">
                      {group.rows.length}명
                    </Text>
                    {!isEmpty && (
                      <View
                        style={{
                          transform: [
                            { rotate: collapsedIds.includes(group.id) ? "-90deg" : "0deg" },
                          ],
                        }}
                      >
                        <Icon name="arrow-drop-down" size={16} color={colors.icon.strongest} />
                      </View>
                    )}
                  </View>
                </Pressable>
              )}
              {!(filter === "all" && collapsedIds.includes(group.id)) &&
                group.rows.map((row, index) => (
                  <View key={row.id}>
                    {index > 0 && <View className="h-px bg-background-muted" />}
                    <View className="flex-row items-center py-2">
                      <View className="flex-1 flex-row items-center gap-1.5">
                        <Text
                          className={
                            row.role
                              ? "text-body-main text-text-normal"
                              : "text-body-regular text-text-normal"
                          }
                        >
                          {row.name}
                        </Text>
                        {row.role === "leader" && (
                          <View className="rounded bg-primary-normal px-1.5 py-0.5">
                            <Text className="text-caption-small text-text-disable">
                              {row.roleLabel}
                            </Text>
                          </View>
                        )}
                        {row.role === "viceLeader" && (
                          <View className="rounded border border-primary-normal bg-background-normal px-1.5 py-0.5">
                            <Text className="text-caption-small text-primary-normal">
                              {row.roleLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                      {row.weeks.map((week, weekIndex) => (
                        <AttendanceMarkPair key={weekIndex} marks={week} />
                      ))}
                    </View>
                  </View>
                ))}
            </View>
          );
        })}
        {groups.length === 0 && (
          <Text className="pt-10 text-center text-body-medium text-text-alternative">
            {isLoading ? "출석부를 불러오고 있어요." : "표시할 출석 기록이 없어요."}
          </Text>
        )}
      </ScrollView>

      {/* 셀/팀 선택 시트 (시안 액션시트) */}
      <AppSheet
        ref={pickerSheetRef}
        footer={
          <Pressable
            className="items-center bg-background-normal py-4"
            onPress={() => pickerSheetRef.current?.close()}
          >
            <Text className="text-body-regular text-text-alternative">취소</Text>
          </Pressable>
        }
      >
        <View className="px-6 pb-2 pt-1">
          {pickerOptions.map((option) => (
            <Pressable
              key={option.id}
              className="py-3"
              onPress={() => handlePickerSelect(option.id)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text
                className={
                  option.name === pickerValue
                    ? "text-body-main text-primary-normal"
                    : "text-body-regular text-text-normal"
                }
              >
                {option.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppSheet>
    </View>
  );
}
