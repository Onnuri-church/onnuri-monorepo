import type { AdminDownloadPreview } from "@onnuri/shared";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { RootStackParamList } from "../../shared/types/navigation";
import { useAdminDownloadPreview } from "./api";

type Tab = "member" | "attendance";

function RowCard({ title, caption, meta }: { title: string; caption: string; meta: string }) {
  return (
    <View className="border-b border-background-muted py-3">
      <Text className="text-body-main text-text-normal">{title}</Text>
      <Text className="mt-0.5 text-caption-main text-text-alternative">{caption}</Text>
      <Text className="mt-0.5 text-caption-main text-text-alternative">{meta}</Text>
    </View>
  );
}

function MemberList({ data }: { data: NonNullable<AdminDownloadPreview["member"]> }) {
  return (
    <View>
      {data.rows.map((row, index) => (
        <RowCard
          key={`${row.name}-${index}`}
          title={row.name}
          caption={
            [row.gender, row.age !== null ? `${row.age}세` : null].filter(Boolean).join(" · ") ||
            "정보 없음"
          }
          meta={`셀 ${row.cell ?? "없음"} · 팀 ${row.team ?? "없음"}`}
        />
      ))}
      {data.total > data.rows.length && (
        <Text className="pt-4 text-center text-caption-main text-text-alternative">
          외 {data.total - data.rows.length}명
        </Text>
      )}
    </View>
  );
}

function AttendanceList({ data }: { data: NonNullable<AdminDownloadPreview["attendance"]> }) {
  return (
    <View>
      {data.rows.map((row, index) => (
        <RowCard
          key={`${row.name}-${index}`}
          title={row.name}
          caption={`${row.cell} · ${row.role} · ${row.period}`}
          meta={`예배 ${row.worshipCount}회 · 셀모임 ${row.meetingCount}회 (${row.weekTotal}주 중)`}
        />
      ))}
      {data.total > data.rows.length && (
        <Text className="pt-4 text-center text-caption-main text-text-alternative">
          외 {data.total - data.rows.length}줄
        </Text>
      )}
    </View>
  );
}

// 데이터 다운로드 > 미리보기 — 내려받기 전에 건수와 앞쪽 10줄만 확인한다. 다운로드는 이전 화면에서.
// 연락처·생년월일은 서버가 싣지 않는다(나이만).
export function AdminDataPreviewScreen() {
  const { query } = useRoute<RouteProp<RootStackParamList, "AdminDataPreview">>().params;
  const { data, isLoading } = useAdminDownloadPreview(query);
  const [tab, setTab] = useState<Tab>("member");

  const hasBoth = !!data?.member && !!data?.attendance;
  const activeTab: Tab = hasBoth ? tab : data?.member ? "member" : "attendance";

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        {!data ? (
          <Text className="pt-10 text-center text-body-medium text-text-alternative">
            {isLoading ? "불러오고 있어요." : "미리보기를 불러오지 못했어요."}
          </Text>
        ) : (
          <>
            <Text className="text-caption-main text-text-alternative">기간 {data.rangeLabel}</Text>
            {hasBoth && (
              <View className="mt-3 flex-row gap-5">
                {(["member", "attendance"] as const).map((key) => (
                  <Pressable key={key} onPress={() => setTab(key)}>
                    <Text
                      className={
                        activeTab === key
                          ? "text-body-main text-text-normal"
                          : "text-body-regular text-text-alternative"
                      }
                    >
                      {key === "member"
                        ? `회원 정보 ${data.member?.total}명`
                        : `출석부 ${data.attendance?.total}줄`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {!hasBoth && (
              <Text className="mt-3 text-body-main text-text-normal">
                {activeTab === "member"
                  ? `회원 정보 ${data.member?.total}명`
                  : `출석부 ${data.attendance?.total}줄 · ${data.attendance?.weekCount}주`}
              </Text>
            )}
            <View className="mt-2">
              {activeTab === "member" && data.member && <MemberList data={data.member} />}
              {activeTab === "attendance" && data.attendance && (
                <AttendanceList data={data.attendance} />
              )}
              {(activeTab === "member" ? data.member?.total : data.attendance?.total) === 0 && (
                <Text className="pt-10 text-center text-body-medium text-text-alternative">
                  조건에 맞는 데이터가 없어요.
                </Text>
              )}
            </View>
            <Text className="mt-6 text-center text-caption-main text-text-alternative">
              앞쪽 10건만 보여드려요. 전체는 엑셀로 내려받을 수 있어요.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
