import type { AdminMemberSummary } from "@onnuri/shared";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable, Text, View } from "react-native";

import { AppSheet, type AppSheetRef } from "../base/AppSheet";
import { Icon } from "../base/Icon";
import { colors } from "../../theme/tokens";
import { useThemeColors } from "../../theme/useThemeColors";

interface MemberPickerFieldProps {
  label: string;
  placeholder: string;
  members: AdminMemberSummary[] | undefined;
  /** 선택된 회원 id — 추가 트리거로 쓸 때는 null을 넘긴다 */
  valueId: string | null;
  onSelect: (memberId: string) => void;
  /** 목록에서 뺄 회원 (이미 셀장인 사람 등) */
  excludeIds?: string[];
}

function affiliationOf(member: AdminMemberSummary): string {
  return [member.cellName, member.teamName].filter(Boolean).join(" · ");
}

// 회원을 검색해서 고르는 필드 — 셀장·부셀장·팀장·소그룹장 선택이 같이 쓴다.
// 회원이 많아져도 목록을 훑지 않고 이름(또는 소속)으로 걸러 고른다. 선택은 이름이 아니라
// id로 하므로 동명이인이어도 엉뚱한 사람이 잡히지 않고, 행마다 소속을 같이 보여준다.
export function MemberPickerField({
  label,
  placeholder,
  members,
  valueId,
  onSelect,
  excludeIds = [],
}: MemberPickerFieldProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const sheetRef = useRef<AppSheetRef>(null);
  const [query, setQuery] = useState("");

  const selected = (members ?? []).find((member) => member.id === valueId) ?? null;

  const candidates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (members ?? [])
      .filter((member) => !excludeIds.includes(member.id))
      .filter((member) =>
        keyword === ""
          ? true
          : member.name.toLowerCase().includes(keyword) ||
            affiliationOf(member).toLowerCase().includes(keyword),
      );
    // excludeIds는 렌더마다 새 배열이라 문자열 키로 비교한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, query, excludeIds.join(",")]);

  const handleTriggerPress = () => {
    Keyboard.dismiss();
    setQuery("");
    sheetRef.current?.open();
  };

  const handleSelect = (memberId: string) => {
    onSelect(memberId);
    sheetRef.current?.close();
  };

  return (
    <View className="py-4">
      {label !== "" && <Text className="text-body-main text-text-normal">{label}</Text>}

      <Pressable
        onPress={handleTriggerPress}
        className="mt-1 h-12 flex-row items-center justify-between border-b border-background-assistive px-2"
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Text
          className={
            selected
              ? "text-heading-small text-text-normal"
              : "text-heading-small text-text-assistive"
          }
        >
          {selected ? selected.name : placeholder}
        </Text>
        <Icon name="arrow-drop-down" color={colors.icon.accent} />
      </Pressable>
      {selected && affiliationOf(selected) !== "" && (
        <Text className="mt-1 px-2 text-caption-main text-text-alternative">
          {affiliationOf(selected)}
        </Text>
      )}

      <AppSheet
        ref={sheetRef}
        footer={
          <View className="bg-background-normal px-4 pb-4">
            <View className="border-t-2 border-background-assistive" />
            <Pressable
              onPress={() => sheetRef.current?.close()}
              className="pt-4"
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text className="text-center text-body-medium text-text-alternative">{t("취소")}</Text>
            </Pressable>
          </View>
        }
      >
        <View className="px-4 pb-6 pt-2">
          <BottomSheetTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("이름 또는 소속으로 검색")}
            placeholderTextColor={themeColors.text.assistive}
            autoCorrect={false}
            style={{
              height: 44,
              borderRadius: 10,
              paddingHorizontal: 14,
              backgroundColor: themeColors.background.muted,
              color: themeColors.text.normal,
              fontSize: 15,
            }}
          />
          <Text className="mb-1 mt-3 text-caption-main text-text-alternative">
            {t("{{count}}명", { count: candidates.length })}
          </Text>
          {candidates.map((member) => (
            <Pressable
              key={member.id}
              onPress={() => handleSelect(member.id)}
              className="flex-row items-center justify-between border-b border-background-muted py-3"
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              <Text
                className={
                  member.id === valueId
                    ? "text-body-main text-primary-normal"
                    : "text-body-main text-text-normal"
                }
              >
                {member.name}
              </Text>
              <Text className="ml-3 shrink text-caption-main text-text-alternative" numberOfLines={1}>
                {affiliationOf(member) || t("소속 없음")}
              </Text>
            </Pressable>
          ))}
          {candidates.length === 0 && (
            <Text className="py-6 text-center text-body-regular text-text-alternative">
              {t("검색 결과가 없어요.")}
            </Text>
          )}
        </View>
      </AppSheet>
    </View>
  );
}
