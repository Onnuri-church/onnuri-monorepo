import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import {
  ADMIN_CELL_NAMES,
  ADMIN_TEAM_NAMES,
  ATTENDANCE_BY_CELL,
  ATTENDANCE_BY_TEAM,
  ATTENDANCE_DATES,
  type AttendanceGroup,
  type AttendanceMark,
} from "./adminMock";
import { RadioOption } from "./components/RadioOption";

type AttendanceFilter = "all" | "cell" | "team";

// 칸 하나 — 왼쪽 예배 / 오른쪽 셀모임. O=초록, X=회색, -=대시(셀모임 없던 주).
// 시안 결석 #E4E4E4는 토큰에 없어 background.muted(#ECECEC)로 근사.
function AttendanceMarkPair({ marks }: { marks: [AttendanceMark, AttendanceMark] }) {
  return (
    <View className="w-8 flex-row items-center justify-center gap-1">
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

// 마이페이지 관리자 메뉴 > 출석부. 2026-09-09 시안 기준, adminMock 목업 — API 연동 시 교체.
// 헤더의 "다운로드"는 RootNavigator 등록부에서 데이터 다운로드 화면으로 연결한다.
export function AdminAttendanceScreen() {
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [selectedCell, setSelectedCell] = useState(ADMIN_CELL_NAMES[0]);
  const [selectedTeam, setSelectedTeam] = useState(ADMIN_TEAM_NAMES[6]);
  const pickerSheetRef = useRef<AppSheetRef>(null);

  // 목업이라 어떤 셀/팀을 골라도 같은 표본을 보여준다 — API 연동 시 선택값으로 조회.
  const groups: AttendanceGroup[] =
    filter === "all"
      ? ATTENDANCE_BY_CELL
      : filter === "cell"
        ? ATTENDANCE_BY_CELL.slice(0, 1)
        : ATTENDANCE_BY_TEAM;

  const pickerOptions = filter === "team" ? ADMIN_TEAM_NAMES : ADMIN_CELL_NAMES;
  const pickerValue = filter === "team" ? selectedTeam : selectedCell;

  const handlePickerSelect = (option: string) => {
    if (filter === "team") {
      setSelectedTeam(option);
    } else {
      setSelectedCell(option);
    }
    pickerSheetRef.current?.close();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
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

        {/* 날짜 — 월 선택은 API 연동 시 (지금은 시안의 2026년 8월 고정) */}
        <View className="mt-4 h-11 flex-row items-center justify-center gap-2 rounded-2.5 bg-background-muted">
          <Text className="text-body-main text-text-normal">2026년 8월</Text>
          <Icon name="arrow-drop-down" size={16} color={colors.icon.strongest} />
        </View>

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
          <Text className="flex-1 text-caption-main text-text-alternative">이름</Text>
          {ATTENDANCE_DATES.map((date) => (
            <Text key={date} className="w-8 text-center text-caption-main text-text-alternative">
              {date}
            </Text>
          ))}
        </View>
        <View className="h-px bg-background-assistive" />

        {/* 출석 표 — 전체 필터는 셀별 그룹 헤더가 붙는다 */}
        {groups.map((group) => (
          <View key={group.id}>
            {filter === "all" && (
              <View className="-mx-5 mt-0 flex-row items-center justify-between bg-background-muted px-5 py-2">
                <Text className="text-body-main text-text-normal">{group.name}</Text>
                <Text className="text-caption-main text-text-alternative">
                  {group.rows.length}명
                </Text>
              </View>
            )}
            {group.rows.map((row, index) => (
              <View key={row.id}>
                {index > 0 && <View className="h-px bg-background-muted" />}
                <View className="flex-row items-center py-2">
                  <View className="flex-1 flex-row items-center gap-1.5">
                    <Text
                      className={
                        row.role ? "text-body-main text-text-normal" : "text-body-regular text-text-normal"
                      }
                    >
                      {row.name}
                    </Text>
                    {row.role === "leader" && (
                      <View className="rounded bg-primary-normal px-1.5 py-0.5">
                        <Text className="text-caption-small text-text-disable">셀장</Text>
                      </View>
                    )}
                    {row.role === "viceLeader" && (
                      <View className="rounded border border-primary-normal bg-background-normal px-1.5 py-0.5">
                        <Text className="text-caption-small text-primary-normal">부셀장</Text>
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
        ))}
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
              key={option}
              className="py-3"
              onPress={() => handlePickerSelect(option)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text
                className={
                  option === pickerValue
                    ? "text-body-main text-primary-normal"
                    : "text-body-regular text-text-normal"
                }
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppSheet>
    </View>
  );
}
