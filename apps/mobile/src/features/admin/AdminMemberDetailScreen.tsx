import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Avatar } from "../../shared/components/base/Avatar";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useAdminMember, useDeleteAdminMember } from "./api";
import { MemberBadge } from "./components/MemberBadge";

// 마이페이지 관리자 메뉴 > 회원 관리 > 회원 상세 — GET /users/:id 실데이터.
// 편집은 헤더 "편집" 버튼(RootNavigator 등록부)으로 AdminMemberEdit에 간다 (2026-09-21 시안).
export function AdminMemberDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AdminMemberDetail">>();
  const { data: member, isLoading } = useAdminMember(route.params.memberId);

  const deleteMember = useDeleteAdminMember();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  if (!member) {
    return (
      <View className="flex-1 items-center justify-center bg-background-page">
        <Text className="text-body-regular text-text-alternative">
          {isLoading ? "회원 정보를 불러오고 있어요." : "회원을 찾을 수 없어요."}
        </Text>
      </View>
    );
  }

  const infoRows = [
    { label: "이름", value: member.name },
    { label: "생년월일", value: member.birthDateLabel ?? "미입력" },
    { label: "성별", value: member.genderLabel ?? "미입력" },
    { label: "연락처", value: member.phone ?? "미입력" },
    { label: "소속 셀", value: member.cell?.name ?? "무소속" },
    { label: "소속 팀", value: member.team?.name ?? "무소속" },
    { label: "권한", value: member.roleLabel },
    { label: "가입일", value: member.joinedAtLabel },
  ];

  const handleDeleteConfirmPress = () => {
    setDeleteModalVisible(false);
    if (deleteMember.isPending) return;
    deleteMember.mutate(member.id, { onSuccess: () => navigation.goBack() });
  };

  return (
    /* 시안 배경 #F5F5F5 — 토큰에 없어 background.page로 근사 (목록 화면과 동일) */
    <ScrollView className="bg-background-page" contentContainerClassName="px-5 pb-10 pt-6">
      {/* 프로필 영역 */}
      <View className="items-center">
        {member?.avatarUrl ? (
          <Avatar imageUrl={member.avatarUrl} size={80} />
        ) : (
          <View className="h-20 w-20 items-center justify-center rounded-full bg-background-muted">
            <Icon name="user" size={40} />
          </View>
        )}
        <Text className="mt-2.5 text-heading-main text-text-normal">{member.name}</Text>
        {member.badge && (
          <View className="mt-1.5">
            <MemberBadge badge={member.badge} />
          </View>
        )}
      </View>

      {/* 회원 정보 카드 */}
      <View className="mt-6 rounded-5 bg-background-normal px-4 py-2 shadow-card">
        {infoRows.map((row, index) => (
          <View key={row.label}>
            {index > 0 && <View className="h-px bg-background-assistive" />}
            <View className="flex-row items-center justify-between py-3.5">
              <Text className="text-body-regular text-text-alternative">{row.label}</Text>
              <Text className="text-body-regular text-text-alternative">{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 회원 삭제 — 시안: 흰 배경 + danger 테두리·글자 */}
      <Pressable
        className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-5 border border-semantic-danger bg-background-normal"
        onPress={() => setDeleteModalVisible(true)}
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Icon name="trash-can" size={18} color={colors.semantic.danger} />
        <Text className="text-body-regular" style={{ color: colors.semantic.danger }}>
          회원 삭제
        </Text>
      </Pressable>

      {/* 삭제 확인 모달 — 문구는 2026-09-09 확정: 기명 보존 정책과 어긋나던 시안 문구를 대체한다. */}
      <Modal transparent visible={deleteModalVisible} animationType="fade">
        <View className="flex-1 items-center justify-center bg-background-dark/40 px-10">
          <View className="w-full rounded-5 bg-background-normal px-6 py-7">
            <Text className="text-center text-body-main text-text-normal">
              {member.name}님을 삭제하시겠습니까?
            </Text>
            <Text className="mt-2 text-center text-body-regular text-text-alternative">
              회원 정보는 삭제되지만,{"\n"}출석 데이터는 기명으로 남아있습니다.
            </Text>
            <View className="mt-5 flex-row justify-center gap-3.5">
              <Pressable
                className="h-8 w-24 items-center justify-center rounded bg-background-assistive"
                onPress={() => setDeleteModalVisible(false)}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                <Text className="text-body-regular text-text-normal">취소</Text>
              </Pressable>
              <Pressable
                className="h-8 w-24 items-center justify-center rounded bg-semantic-danger"
                onPress={handleDeleteConfirmPress}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                <Text className="text-body-regular text-text-disable">삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
