import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { GroupMeetingMember } from "@onnuri/shared";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchGroupMeetingDetail, useDecideGroupMeetingMember } from "./api";
import { AppDialog, type AppDialogRef } from "../../shared/components/base/AppDialog";
import { Avatar } from "../../shared/components/base/Avatar";
import type { RootStackParamList } from "../../shared/types/navigation";

// 신청 대기 전체 보기 (상세의 "신청 대기" 행에서 진입) — 소그룹장·관리자 전용, 신청순.
// 참여멤버 화면과 같은 행 모양에 승인/거절 알약 버튼을 붙인다.
export function GroupMeetingPendingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "GroupMeetingPending">>();

  // 상세와 같은 키 — 승인/거절 응답(갱신된 상세)이 이 캐시를 바로 교체해 목록에서 빠진다.
  const { data: meeting } = useQuery({
    queryKey: ["group-meetings", params.meetingId],
    queryFn: () => fetchGroupMeetingDetail(params.meetingId),
  });
  const pending = meeting?.pendingMembers ?? [];

  const decideMember = useDecideGroupMeetingMember(params.meetingId);
  // 거절은 되돌릴 수 없어 확인창을 한 번 띄운다 (셀원 삭제와 같은 패턴). 승인은 바로 처리.
  const rejectDialogRef = useRef<AppDialogRef>(null);
  const [pendingReject, setPendingReject] = useState<GroupMeetingMember | null>(null);

  const handleDecide = (userId: string, status: "APPROVED" | "REJECTED") => {
    if (decideMember.isPending) return;
    decideMember.mutate(
      { userId, status },
      { onError: () => Alert.alert(t("처리 실패"), t("잠시 후 다시 시도해주세요.")) },
    );
  };

  const handleRejectPress = (member: GroupMeetingMember) => {
    setPendingReject(member);
    rejectDialogRef.current?.open();
  };

  const confirmReject = () => {
    rejectDialogRef.current?.close();
    if (pendingReject) handleDecide(pendingReject.id, "REJECTED");
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        contentContainerClassName="px-5"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        <Text className="text-center text-caption-main text-text-alternative">
          {t("총 {{count}}명", { count: pending.length })}
        </Text>
        {pending.length === 0 ? (
          <Text className="pt-16 text-center text-body-medium text-text-alternative">
            {t("대기 중인 신청이 없어요")}
          </Text>
        ) : (
          <View className="mt-8">
            {pending.map((member) => (
              <View
                key={member.id}
                className="flex-row items-center justify-between border-b border-text-assistive py-2.5"
              >
                <View className="flex-row items-center gap-4">
                  <Avatar imageUrl={member.avatarUrl} size={40} />
                  <Text className="text-body-main text-text-normal">{member.name}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    className="h-8 items-center justify-center rounded-lg bg-primary-normal px-3"
                    onPress={() => handleDecide(member.id, "APPROVED")}
                    disabled={decideMember.isPending}
                    style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                  >
                    <Text className="text-body-small text-text-disable">{t("승인")}</Text>
                  </Pressable>
                  <Pressable
                    className="h-8 items-center justify-center rounded-lg border border-semantic-danger px-3"
                    onPress={() => handleRejectPress(member)}
                    disabled={decideMember.isPending}
                    style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                  >
                    <Text className="text-body-small text-semantic-danger">{t("거절")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AppDialog
        ref={rejectDialogRef}
        title={t("{{name}}님의 신청을 거절하시겠습니까?", { name: pendingReject?.name ?? "" })}
        confirmLabel={t("거절")}
        cancelLabel={t("취소")}
        onConfirm={confirmReject}
      />
    </View>
  );
}
