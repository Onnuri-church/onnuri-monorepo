import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { LeaderGrade, LeaderRoomCandidate } from "@onnuri/shared";
import type { TFunction } from "i18next";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Avatar } from "../../shared/components/base/Avatar";
import { Header } from "../../shared/components/base/Header";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useMe } from "../profile/useMe";
import { MemberPickRow } from "../team-story/components/MemberPickRow";
import {
  useAddLeaderRoomMembers,
  useCreateLeaderRoom,
  useDeleteLeaderRoom,
  useLeaderRoomCandidates,
  useLeaderRoomDetail,
  useRemoveLeaderRoomMember,
  useRenameLeaderRoom,
} from "./api";

// 선택 목록에 보이는 한 줄 설명 — "팀장 · 찬양팀"처럼 등급과 소속을 같이 보여준다.
function describeCandidate(candidate: LeaderRoomCandidate, t: TFunction): string {
  const gradeLabel: Record<LeaderGrade, string> = {
    admin: t("관리자"),
    teamLeader: t("팀장"),
    cellLeader: t("셀장"),
    viceLeader: t("부셀장"),
  };
  const label = gradeLabel[candidate.grade];
  return candidate.affiliation ? `${label} · ${candidate.affiliation}` : label;
}

// 리더 방 만들기·관리 — 관리자만 연다.
// 만들기: 방 이름 + 들어갈 리더(팀장·셀장·부셀장·관리자)를 고른다. 관리(roomId가 있을 때): 이름 수정,
// 멤버 내보내기, 멤버 추가, 방 삭제 — 팀 단톡방 관리와 같은 흐름이다.
export function LeaderRoomFormScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "LeaderRoomForm">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { roomId } = params;
  const me = useMe();

  const { data: room } = useLeaderRoomDetail(roomId);
  const { data: candidateList } = useLeaderRoomCandidates(me?.isAdmin === true);
  const createRoom = useCreateLeaderRoom();
  const rename = useRenameLeaderRoom(roomId ?? "");
  const addMembers = useAddLeaderRoomMembers(roomId ?? "");
  const removeMember = useRemoveLeaderRoomMember(roomId ?? "");
  const deleteRoom = useDeleteLeaderRoom(roomId ?? "");
  const deleteDialogRef = useRef<AppDialogRef>(null);

  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || !room) return;
    setName(room.name);
    setPrefilled(true);
  }, [room, prefilled]);

  const roomMemberIds = new Set((room?.members ?? []).map((member) => member.id));
  // 관리 모드에서는 아직 방에 없는 리더만 추가 후보로 보인다.
  const candidates = (candidateList ?? []).filter(
    (candidate) => !roomId || !roomMemberIds.has(candidate.id),
  );

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const showError = (title: string) => (error: unknown) => {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    Alert.alert(title, message ?? t("잠시 후 다시 시도해주세요."));
  };

  const handleSavePress = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t("단톡방 이름을 입력해주세요."));
      return;
    }
    try {
      if (roomId) {
        if (trimmed !== room?.name) await rename.mutateAsync({ name: trimmed });
        if (selectedIds.length > 0) await addMembers.mutateAsync({ userIds: selectedIds });
        navigation.goBack();
      } else {
        const created = await createRoom.mutateAsync({ name: trimmed, memberIds: selectedIds });
        navigation.goBack();
        // 만든 방으로 바로 들어간다
        navigation.navigate("LeaderRoom", { roomId: created.id });
      }
    } catch (error) {
      showError(roomId ? t("저장 실패") : t("만들기 실패"))(error);
    }
  };

  const handleKickPress = (memberId: string, memberName: string) => {
    Alert.alert(t("{{name}}님을 내보낼까요?", { name: memberName }), undefined, [
      { text: t("취소"), style: "cancel" },
      {
        text: t("내보내기"),
        style: "destructive",
        onPress: () => removeMember.mutate(memberId, { onError: showError(t("내보내기 실패")) }),
      },
    ]);
  };

  const handleDeleteConfirm = () => {
    deleteDialogRef.current?.close();
    deleteRoom.mutate(undefined, {
      onSuccess: () => {
        // 방 화면까지 두 단계 뒤로 — 목록으로 돌아간다.
        navigation.goBack();
        navigation.goBack();
      },
      onError: showError(t("삭제 실패")),
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={roomId ? t("리더 방 관리") : t("리더 방 만들기")}
          rightAction="text"
          rightLabel={roomId ? t("저장") : t("만들기")}
          onPressRightLabel={() => void handleSavePress()}
        />
      ),
    });
  });

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        contentContainerClassName="px-5 pt-4"
        // 멤버가 많아져도 맨 아래 "방 삭제" 버튼이 안드로이드 내비 바에 가리지 않게 넉넉히 둔다.
        contentContainerStyle={{ paddingBottom: 64 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-body-main text-text-normal">{t("방 이름")}</Text>
        <TextInput
          className="mt-2 h-11 rounded-xl bg-background-muted px-4 text-body-medium text-text-normal"
          value={name}
          onChangeText={setName}
          placeholder={t("예: 팀장 회의방")}
          placeholderTextColor={themeColors.text.alternative}
          maxLength={30}
        />

        {roomId && (
          <View className="mt-8">
            <Text className="text-body-main text-text-normal">
              {t("참여 중인 멤버 ({{count}})", { count: room?.members.length ?? 0 })}
            </Text>
            {(room?.members ?? []).map((member) => (
              <View
                key={member.id}
                className="flex-row items-center justify-between border-b border-text-assistive py-2.5"
              >
                <View className="flex-row items-center gap-4">
                  <Avatar imageUrl={member.avatarUrl} size={40} />
                  <Text className="text-body-main text-text-normal">{member.name}</Text>
                </View>
                <Pressable onPress={() => handleKickPress(member.id, member.name)} hitSlop={10}>
                  <Text className="text-body-small text-semantic-danger">{t("내보내기")}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View className="mt-8">
          <Text className="text-body-main text-text-normal">
            {roomId ? t("리더 추가") : t("들어갈 리더 선택")}
          </Text>
          <Text className="mt-1 text-caption-main text-text-alternative">
            {t("{{count}}명 선택됨", { count: selectedIds.length })}
          </Text>
          {candidates.map((candidate) => (
            <MemberPickRow
              key={candidate.id}
              name={candidate.name}
              affiliation={describeCandidate(candidate, t)}
              selected={selectedIds.includes(candidate.id)}
              onPress={() => toggle(candidate.id)}
            />
          ))}
          {candidates.length === 0 && (
            <Text className="py-6 text-center text-body-small text-text-alternative">
              {t("추가할 리더가 없어요.")}
            </Text>
          )}
        </View>

        {roomId && (
          <Pressable
            className="mt-10 h-12 items-center justify-center rounded-xl border border-semantic-danger active:opacity-60"
            onPress={() => deleteDialogRef.current?.open()}
          >
            <Text className="text-body-main text-semantic-danger">{t("리더 방 삭제")}</Text>
          </Pressable>
        )}
      </ScrollView>

      <AppDialog
        ref={deleteDialogRef}
        title={t("이 리더 방을 삭제하시겠습니까?")}
        description={t("방이 사라지고 멤버 모두 더 이상 볼 수 없어요.")}
        confirmLabel={t("삭제")}
        cancelLabel={t("취소")}
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
