import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "../../shared/components/base/Icon";
import { SearchBar } from "../../shared/components/base/SearchBar";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { ADMIN_MEMBERS } from "./adminMock";
import { MemberBadge } from "./components/MemberBadge";

// 마이페이지 관리자 메뉴 > 회원 관리. 2026-09-09 시안 기준, adminMock 목업 — API 연동 시 교체.
export function AdminMemberListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [keyword, setKeyword] = useState("");

  // 시안 검색바 플레이스홀더가 "이름 · 셀 · 팀으로 검색" — 세 필드 모두에 부분 일치.
  const members = ADMIN_MEMBERS.filter((member) =>
    keyword === ""
      ? true
      : [member.name, member.cellName, member.teamName].some((field) =>
          field.includes(keyword.trim()),
        ),
  );

  const handleMemberPress = (memberId: string) => {
    navigation.navigate("AdminMemberDetail", { memberId });
  };

  return (
    /* 시안 배경 #F5F5F5 — 토큰에 없어 background.page(#FBFBFB)로 근사 */
    <ScrollView
      className="bg-background-page"
      contentContainerClassName="px-5 pb-10 pt-4"
      keyboardShouldPersistTaps="handled"
    >
      <SearchBar value={keyword} onChangeText={setKeyword} placeholder="이름 · 셀 · 팀으로 검색" />

      <Text className="mt-3 pl-1 text-caption-main text-text-alternative">
        전체 {members.length}명
      </Text>

      <View className="mt-2 rounded-5 bg-background-normal px-4 py-2 shadow-card">
        {members.map((member, index) => (
          <View key={member.id}>
            {index > 0 && <View className="h-px bg-background-assistive" />}
            <Pressable
              className="flex-row items-center gap-3 py-2"
              onPress={() => handleMemberPress(member.id)}
              style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
            >
              {/* TODO(사진): 프로필 사진 연동 전 placeholder */}
              <View className="h-10 w-10 items-center justify-center rounded-full bg-background-muted">
                <Icon name="user" size={20} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-body-main text-text-normal">{member.name}</Text>
                  {member.badge && <MemberBadge badge={member.badge} />}
                </View>
                <Text className="mt-0.5 text-caption-main text-text-alternative">
                  {member.cellName} · {member.teamName}
                </Text>
              </View>
              <Icon name="expand-right" size={16} color={colors.icon.normal} />
            </Pressable>
          </View>
        ))}
        {members.length === 0 && (
          <Text className="py-6 text-center text-body-regular text-text-alternative">
            검색 결과가 없어요.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

