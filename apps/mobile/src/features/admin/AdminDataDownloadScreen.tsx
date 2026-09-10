import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../../shared/components/base/AppSheet";
import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import { ADMIN_CELL_NAMES, ADMIN_TEAM_NAMES } from "./adminMock";
import { RadioOption } from "./components/RadioOption";

type DataKind = "member" | "attendance" | "both";
type Target = "all" | "cell" | "team";
type Period = "all" | "thisYear" | "lastYear" | "custom";

// 기간별 표기 (시안 값). 직접 선택의 날짜 편집은 API 연동과 함께 — 지금은 시안 예시 고정.
const PERIOD_CAPTION: Record<Exclude<Period, "all">, string> = {
  thisYear: "2026.01.01 ~ 2026.08.31",
  lastYear: "2025.01.01 ~ 2025.12.31",
  custom: "2026.03.01 ~ 2026.08.31",
};

function SectionLabel({ children }: { children: string }) {
  return <Text className="text-body-main text-text-normal">{children}</Text>;
}

// 관리자 출석부·회원 관리 헤더의 "다운로드"로 진입. 2026-09-09 시안 기준 목업 —
// 엑셀 추출 스펙은 docs/attendance-data-model.md §4 (대상×기간 필터, 시트 2장).
export function AdminDataDownloadScreen() {
  const [dataKind, setDataKind] = useState<DataKind | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const pickerSheetRef = useRef<AppSheetRef>(null);

  const pickerOptions = target === "team" ? ADMIN_TEAM_NAMES : ADMIN_CELL_NAMES;
  const pickerValue = target === "team" ? selectedTeam : selectedCell;

  // 세 질문에 다 답해야 활성 — 특정 셀/팀이면 대상 선택까지 (시안의 비활성 회색 버튼).
  const canDownload =
    dataKind !== null &&
    target !== null &&
    period !== null &&
    (target === "all" || pickerValue !== null);

  const handlePickerSelect = (option: string) => {
    if (target === "team") {
      setSelectedTeam(option);
    } else {
      setSelectedCell(option);
    }
    pickerSheetRef.current?.close();
  };

  const handleDownloadPress = () => {
    // TODO(API): 엑셀 생성·다운로드 연동 — 목업 단계라 안내만 띄운다.
    Alert.alert("데이터 다운로드", "엑셀 추출은 API 연동 후 동작해요.");
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="gap-7 px-5 pb-6 pt-6">
        <View className="gap-4">
          <SectionLabel>어떤 데이터가 필요하세요?</SectionLabel>
          <View className="flex-row items-center gap-5">
            <RadioOption
              label="회원 정보"
              selected={dataKind === "member"}
              onPress={() => setDataKind("member")}
            />
            <RadioOption
              label="출석 데이터"
              selected={dataKind === "attendance"}
              onPress={() => setDataKind("attendance")}
            />
            <RadioOption
              label="둘 다"
              selected={dataKind === "both"}
              onPress={() => setDataKind("both")}
            />
          </View>
        </View>

        <View className="gap-4">
          <SectionLabel>누구의 데이터인가요?</SectionLabel>
          <View className="flex-row items-center gap-5">
            <RadioOption
              label="청년부 전체"
              selected={target === "all"}
              onPress={() => setTarget("all")}
            />
            <RadioOption
              label="특정 셀"
              selected={target === "cell"}
              onPress={() => setTarget("cell")}
            />
            <RadioOption
              label="특정 팀"
              selected={target === "team"}
              onPress={() => setTarget("team")}
            />
          </View>
          {(target === "cell" || target === "team") && (
            <Pressable
              className="h-12 flex-row items-center justify-between rounded-2.5 bg-background-muted px-4"
              onPress={() => pickerSheetRef.current?.open()}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-body-regular text-text-alternative">
                {target === "team" ? "선택한 팀" : "선택한 셀"}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-body-main text-primary-normal">
                  {pickerValue ?? "선택해주세요"}
                </Text>
                <Icon name="expand-right" size={14} color={colors.icon.normal} />
              </View>
            </Pressable>
          )}
        </View>

        <View className="gap-4">
          <SectionLabel>어느 기간이요?</SectionLabel>
          <View className="flex-row flex-wrap items-center gap-x-5 gap-y-3">
            <RadioOption
              label="전체"
              selected={period === "all"}
              onPress={() => setPeriod("all")}
            />
            <RadioOption
              label="올해"
              selected={period === "thisYear"}
              onPress={() => setPeriod("thisYear")}
            />
            <RadioOption
              label="작년"
              selected={period === "lastYear"}
              onPress={() => setPeriod("lastYear")}
            />
            <RadioOption
              label="직접 선택"
              selected={period === "custom"}
              onPress={() => setPeriod("custom")}
            />
          </View>
          {period !== null && period !== "all" && (
            <Text className="text-body-regular text-text-alternative">
              {PERIOD_CAPTION[period]}
            </Text>
          )}
        </View>
      </ScrollView>

      <View className="px-5 pb-12">
        <Button label="다운로드" disabled={!canDownload} onPress={handleDownloadPress} />
      </View>

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
