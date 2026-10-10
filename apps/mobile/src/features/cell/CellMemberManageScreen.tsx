import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Icon } from "../../shared/components/base/Icon";
import { SearchBar } from "../../shared/components/base/SearchBar";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useRemoveCellMember } from "../admin/api";
import { toCellMemberRole, useCellDetail } from "./api";
import { Avatar } from "../../shared/components/base/Avatar";
import { useMe } from "../profile/useMe";
import { type CellMember } from "./cellDetail";

// 셀원 관리 (관리 탭 > 셀원 관리 — 셀장·관리자 전용 경로로만 진입한다).
// 시안: "총 N명" 캡션 → 검색 바 → 셀원 목록. 셀장·부셀장은 라벨만 붙는다.
// 추가·삭제는 관리자만 한다 — 셀장은 목록을 보기만 한다 (서버도 같은 규칙).
export function CellMemberManageScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, "CellMemberManage">>();
  const { cellId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAdmin = useMe()?.isAdmin === true;

  // 셀원 목록은 서버에서 온다. 삭제는 DELETE /cells/:id/members/:userId — 멤버십 종료
  // (soft) 후 셀 캐시가 무효화돼 목록에서 빠진다.
  const { data: cellData } = useCellDetail(cellId);
  const removeMember = useRemoveCellMember(cellId);
  const members: CellMember[] = (cellData?.members ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    avatarUrl: member.avatarUrl,
    role: toCellMemberRole(member.role),
  }));
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CellMember | null>(null);
  const deleteDialogRef = useRef<AppDialogRef>(null);

  const visibleMembers = query.trim()
    ? members.filter((member) => member.name.includes(query.trim()))
    : members;

  const handleDeletePress = (member: CellMember) => {
    setPendingDelete(member);
    deleteDialogRef.current?.open();
  };

  const confirmDelete = () => {
    if (pendingDelete && !removeMember.isPending) {
      removeMember.mutate(pendingDelete.id);
    }
    setPendingDelete(null);
    deleteDialogRef.current?.close();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
        <Text className="text-center text-caption-main text-text-alternative">
          {t("총 {{count}}명", { count: members.length })}
        </Text>

        <View className="mt-3">
          <SearchBar value={query} onChangeText={setQuery} placeholder={t("셀원 이름으로 검색")} />
        </View>

        <View className="mt-4">
          {visibleMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              onDeletePress={isAdmin ? () => handleDeletePress(member) : undefined}
            />
          ))}
          {visibleMembers.length === 0 && (
            <Text className="pt-10 text-center text-body-medium text-text-alternative">
              {t("검색 결과가 없어요.")}
            </Text>
          )}
        </View>

        {isAdmin && (
          <Pressable
            className="mt-4 h-12 flex-row items-center justify-center gap-1 rounded-xl border border-dashed border-icon-normal active:opacity-60"
            onPress={() => navigation.navigate("CellMemberAdd", { cellId })}
          >
            <Icon name="plus" size={20} />
            <Text className="text-body-main text-text-alternative">{t("셀원 추가")}</Text>
          </Pressable>
        )}
      </ScrollView>

      <AppDialog
        ref={deleteDialogRef}
        title={t("{{name}}님을 셀에서 삭제하시겠습니까?", { name: pendingDelete?.name ?? "" })}
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

interface MemberRowProps {
  member: CellMember;
  /** 관리자에게만 준다 — 없으면 일반 셀원 행에도 삭제가 붙지 않는다. */
  onDeletePress?: () => void;
}

// 셀원 목록의 한 행 (시안 Member/Detail/Row: 높이 60 = 아바타 40 + 상하 10, 아래 1px 구분선).
function MemberRow({ member, onDeletePress }: MemberRowProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between border-b border-background-assistive py-2.5">
      <View className="flex-row items-center gap-4">
        <Avatar imageUrl={member.avatarUrl} size={40} />
        <Text className="text-body-main text-text-normal">{member.name}</Text>
      </View>
      {member.role === "member" ? (
        onDeletePress && (
        <Pressable onPress={onDeletePress} hitSlop={10}>
          <Text className="text-body-small text-semantic-danger">{t("삭제")}</Text>
        </Pressable>
        )
      ) : (
        <Text className="text-body-small text-primary-normal">
          {member.role === "leader" ? t("셀장") : t("부셀장")}
        </Text>
      )}
    </View>
  );
}
