import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { SearchBar } from "../../shared/components/base/SearchBar";
import type { RootStackParamList } from "../../shared/types/navigation";
import { getCellDetail, type CellMember } from "./cellDetail";

// 셀원 관리 (관리 탭 > 셀원 관리 — 셀장·관리자 전용 경로로만 진입한다).
// 시안: "총 N명" 캡션 → 검색 바 → 셀원 목록. 셀장·부셀장은 라벨만 붙고,
// 일반 셀원 행에는 빨간 "삭제"가 붙는다. 시안에 추가 버튼은 아직 없다 —
// 카드 설명("셀원을 추가하거나 관리해요")과 어긋나서 디자이너 확인 필요.
export function CellMemberManageScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "CellMemberManage">>();
  const { cellId } = route.params;

  // TODO(API): 셀원 조회·삭제 연동 전 — 화면 로컬 상태로만 동작한다.
  const [members, setMembers] = useState<CellMember[]>(() => getCellDetail(cellId).members);
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
    if (pendingDelete) {
      setMembers((prev) => prev.filter((member) => member.id !== pendingDelete.id));
    }
    setPendingDelete(null);
    deleteDialogRef.current?.close();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
        <Text className="text-center text-caption-main text-text-alternative">
          총 {members.length}명
        </Text>

        <View className="mt-3">
          <SearchBar value={query} onChangeText={setQuery} placeholder="셀원 이름으로 검색" />
        </View>

        <View className="mt-4">
          {visibleMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              onDeletePress={() => handleDeletePress(member)}
            />
          ))}
          {visibleMembers.length === 0 && (
            <Text className="pt-10 text-center text-body-medium text-text-alternative">
              검색 결과가 없어요.
            </Text>
          )}
        </View>
      </ScrollView>

      <AppDialog
        ref={deleteDialogRef}
        title={`${pendingDelete?.name ?? ""}님을 셀에서 삭제하시겠습니까?`}
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
      />
    </View>
  );
}

interface MemberRowProps {
  member: CellMember;
  onDeletePress: () => void;
}

// 셀원 목록의 한 행 (시안 Member/Detail/Row: 높이 60 = 아바타 40 + 상하 10, 아래 1px 구분선).
function MemberRow({ member, onDeletePress }: MemberRowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-background-assistive py-2.5">
      <View className="flex-row items-center gap-4">
        {/* TODO(사진): 프로필 사진 연동 전 placeholder */}
        <View className="h-10 w-10 rounded-full bg-background-assistive" />
        <Text className="text-body-main text-text-normal">{member.name}</Text>
      </View>
      {member.role === "member" ? (
        <Pressable onPress={onDeletePress} hitSlop={10}>
          <Text className="text-body-small text-semantic-danger">삭제</Text>
        </Pressable>
      ) : (
        <Text className="text-body-small text-primary-normal">
          {member.role === "leader" ? "셀장" : "부셀장"}
        </Text>
      )}
    </View>
  );
}
