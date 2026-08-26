import { Pressable, Text, View } from "react-native";

import type { AttendanceStatus, MemberAttendance } from "../attendance";

interface AttendanceMemberRowProps {
  attendance: MemberAttendance;
  onWorshipChange: (status: AttendanceStatus) => void;
  onMeetingChange: (status: AttendanceStatus) => void;
}

// 출석 관리 목록의 한 명 (시안: 아바타 30 + 이름, 아래 예배/셀모임 두 줄의 출석·결석 세그먼트).
export function AttendanceMemberRow({
  attendance,
  onWorshipChange,
  onMeetingChange,
}: AttendanceMemberRowProps) {
  return (
    <View className="gap-4 py-4">
      <View className="flex-row items-center gap-2">
        {/* TODO(사진): 프로필 사진 연동 전 placeholder */}
        <View className="h-7.5 w-7.5 rounded-full bg-background-assistive" />
        <Text className="text-body-main text-text-normal">{attendance.name}</Text>
      </View>

      <View className="gap-2.5">
        <StatusRow
          label="예배"
          presentLabel="출석"
          status={attendance.worship}
          onChange={onWorshipChange}
        />
        <StatusRow
          label="셀모임"
          presentLabel="참석"
          status={attendance.meeting}
          onChange={onMeetingChange}
        />
      </View>
    </View>
  );
}

interface StatusRowProps {
  label: string;
  /** 출석 버튼의 표기 — 예배는 "출석", 셀모임은 "참석" (시안). */
  presentLabel: string;
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
}

function StatusRow({ label, presentLabel, status, onChange }: StatusRowProps) {
  return (
    <View className="flex-row items-center">
      <Text className="w-12 text-caption-main text-text-alternative">{label}</Text>
      <View className="flex-1 flex-row gap-1.5">
        <SegmentButton
          label={presentLabel}
          selected={status === "present"}
          tone="present"
          onPress={() => onChange("present")}
        />
        <SegmentButton
          label="결석"
          selected={status === "absent"}
          tone="absent"
          onPress={() => onChange("absent")}
        />
      </View>
    </View>
  );
}

interface SegmentButtonProps {
  label: string;
  selected: boolean;
  /** 선택됐을 때의 색 — 출석은 초록 틴트, 결석은 빨강 틴트 (시안). */
  tone: "present" | "absent";
  onPress: () => void;
}

function SegmentButton({ label, selected, tone, onPress }: SegmentButtonProps) {
  const bg = !selected
    ? "bg-background-muted"
    : tone === "present"
      ? "bg-background-alternative"
      : "bg-background-red";
  const textColor = !selected
    ? "text-text-alternative"
    : tone === "present"
      ? "text-primary-normal"
      : "text-semantic-danger";

  return (
    <Pressable
      className={`h-7 flex-1 items-center justify-center rounded-2xl ${bg}`}
      onPress={onPress}
    >
      <Text className={`text-body-main ${textColor}`}>{label}</Text>
    </Pressable>
  );
}
