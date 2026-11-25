import { type RouteProp, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../shared/components/base/Avatar";
import { Icon } from "../../shared/components/base/Icon";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import { useChatRoom } from "./api";

// 대화 상대 전체보기 (SCRUM-301) — 서랍에는 앞의 몇 명만 보이고, 인원이 많은 방은 여기서 전부 보고
// 이름으로 찾는다. 화면에 보이는 줄만 그리도록 FlatList를 쓴다 (백 명이 넘는 방도 있다).
export function ChatMembersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { kind, id } = useRoute<RouteProp<RootStackParamList, "ChatMembers">>().params;
  const myId = useMe()?.id;
  const { data: room } = useChatRoom(kind, id, false);
  const [keyword, setKeyword] = useState("");

  const members = sortMeFirst(room?.members ?? [], myId);
  const trimmed = keyword.trim().toLowerCase();
  const filtered = trimmed
    ? members.filter((member) => member.name.toLowerCase().includes(trimmed))
    : members;

  return (
    <View className="flex-1 bg-background-normal">
      <View className="px-5 pb-2 pt-3">
        <View className="h-10 flex-row items-center gap-2 rounded-xl bg-background-muted px-3">
          <Icon name="search" size={18} color={themeColors.icon.normal} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder={t("이름으로 검색")}
            placeholderTextColor={themeColors.text.alternative}
            className="flex-1 text-body-main text-text-normal"
            style={{ paddingVertical: 0 }}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
        <Text className="pt-3 text-body-small text-text-alternative">
          {t("대화 상대")} {filtered.length}
        </Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(member) => member.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => (
          <MemberRow name={item.name} avatarUrl={item.avatarUrl} isMe={item.id === myId} />
        )}
        ListEmptyComponent={
          <Text className="px-5 py-10 text-center text-body-small text-text-alternative">
            {t("검색 결과가 없어요")}
          </Text>
        }
      />
    </View>
  );
}

// 내가 맨 위에 오게 한다 — 서랍과 전체보기가 같은 순서를 쓴다.
export function sortMeFirst<M extends { id: string }>(members: M[], myId: string | undefined): M[] {
  if (!myId) return members;
  return [...members].sort((a, b) => Number(b.id === myId) - Number(a.id === myId));
}

export function MemberRow({
  name,
  avatarUrl,
  isMe,
}: {
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3 px-5 py-2">
      <Avatar imageUrl={avatarUrl} size={40} />
      {isMe && (
        <View className="h-5 w-5 items-center justify-center rounded-full bg-text-normal">
          <Text className="text-caption-main text-background-normal">{t("나")}</Text>
        </View>
      )}
      <Text className="text-body-medium text-text-normal">{name}</Text>
    </View>
  );
}
