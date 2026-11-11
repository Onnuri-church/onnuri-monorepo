import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { GroupMeetingDetail } from "@onnuri/shared";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchGroupMeetingDetail, useRemoveGroupMeetingMember } from "./api";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Avatar } from "../../shared/components/base/Avatar";
import type { RootStackParamList } from "../../shared/types/navigation";

type Member = GroupMeetingDetail["members"][number];

// 참여멤버 전체 보기 (상세의 "참여 멤버" 행에서 진입) — 승인된 멤버만, 가입순.
// 시안: 행 = 아바타 40 + 이름, 우측에 소그룹장 표시. 타이틀 아래 가운데 "총 N명".
// 소그룹장·관리자에게는 일반 멤버 행에 "내보내기"가 붙는다 (소그룹장은 내보낼 수 없음).
export function GroupMeetingMemberListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "GroupMeetingMembers">>();

  // 상세를 거쳐 들어오므로 캐시가 있어 바로 그려진다 (상세와 같은 키).
  const { data: meeting } = useQuery({
    queryKey: ["group-meetings", params.meetingId],
    queryFn: () => fetchGroupMeetingDetail(params.meetingId),
  });
  const members = meeting?.members ?? [];
  const canManage = meeting?.canManage === true;

  const removeMember = useRemoveGroupMeetingMember(params.meetingId);
  const removeDialogRef = useRef<AppDialogRef>(null);
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);

  const handleRemovePress = (member: Member) => {
    setPendingRemove(member);
    removeDialogRef.current?.open();
  };

  const confirmRemove = () => {
    removeDialogRef.current?.close();
    if (!pendingRemove || removeMember.isPending) return;
    removeMember.mutate(pendingRemove.id, {
      onError: (error) => {
        const message =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        Alert.alert(t("처리 실패"), message ?? t("잠시 후 다시 시도해주세요."));
      },
    });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        contentContainerClassName="px-5"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        <Text className="text-center text-caption-main text-text-alternative">
          {t("총 {{count}}명", { count: members.length })}
        </Text>
        <View className="mt-8">
          {members.map((member) => (
            <View
              key={member.id}
              className="flex-row items-center justify-between border-b border-text-assistive py-2.5"
            >
              <View className="flex-row items-center gap-4">
                <Avatar imageUrl={member.avatarUrl} size={40} />
                <Text className="text-body-main text-text-normal">{member.name}</Text>
              </View>
              {member.isLeader ? (
                <Text className="text-body-small text-primary-normal">{t("소그룹장")}</Text>
              ) : (
                canManage && (
                  <Pressable
                    className="h-8 items-center justify-center rounded-lg border border-semantic-danger px-3"
                    onPress={() => handleRemovePress(member)}
                    disabled={removeMember.isPending}
                    style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                  >
                    <Text className="text-body-small text-semantic-danger">{t("내보내기")}</Text>
                  </Pressable>
                )
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <AppDialog
        ref={removeDialogRef}
        title={t("{{name}}님을 소그룹에서 내보내시겠습니까?", { name: pendingRemove?.name ?? "" })}
        description={t("단톡방과 활동 사진에도 더 이상 접근할 수 없어요.")}
        confirmLabel={t("내보내기")}
        cancelLabel={t("취소")}
        onConfirm={confirmRemove}
      />
    </View>
  );
}
