import { type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../shared/components/base/Avatar";
import { Icon } from "../../shared/components/base/Icon";
import { PressableScale } from "../../shared/components/base/PressableScale";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useLeaderRoomDetail, useLeaveLeaderRoom } from "../leader-room/api";
import { useMe } from "../profile/useMe";
import { useChatRoomDetail, useLeaveChatRoom } from "../team-space/api";
import { useChatMedia, useChatRoom, useSetChatMute } from "./api";
import { ChatBackgroundPicker } from "./components/ChatBackgroundPicker";
import { ChatImageViewer } from "./components/ChatImageViewer";

const THUMB_SIZE = 96;

// 단톡방 서랍(☰) — 카카오톡의 채팅방 서랍처럼 오른쪽 위 알림(🔔), 사진/동영상 모아보기,
// 배경 바꾸기(내 폰에서만), 대화 상대를 보여준다. 팀 단톡방·리더 방은 관리/나가기도 여기서 한다 (SCRUM-230).
export function ChatRoomInfoScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { kind, id, title } = useRoute<RouteProp<RootStackParamList, "ChatRoomInfo">>().params;
  const myId = useMe()?.id;

  const { data: room } = useChatRoom(kind, id, false);
  const { data: media } = useChatMedia(kind, id);
  const setMute = useSetChatMute(kind, id);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // 팀 단톡방·리더 방만 관리(이름·멤버·삭제)와 나가기가 있다. 셀·소그룹 방은 소속이 바뀌면 멤버가 자동으로 바뀐다.
  const { data: teamRoom } = useChatRoomDetail(kind === "room" ? id : undefined);
  const { data: leaderRoom } = useLeaderRoomDetail(kind === "leader" ? id : undefined);
  const leaveTeam = useLeaveChatRoom(id);
  const leaveLeader = useLeaveLeaderRoom(id);
  const canManage = kind === "room" ? teamRoom?.canManage : leaderRoom?.canManage;
  const isMember = (room?.members ?? []).some((member) => member.id === myId);
  const canLeave = (kind === "room" || kind === "leader") && isMember;

  const muted = room?.muted ?? false;
  const mediaUrls = (media ?? []).map((item) => item.url);

  const handleManage = () => {
    if (kind === "room" && teamRoom) {
      navigation.navigate("ChatRoomForm", { teamId: teamRoom.teamId, roomId: teamRoom.id });
    } else if (kind === "leader" && leaderRoom) {
      navigation.navigate("LeaderRoomForm", { roomId: leaderRoom.id });
    }
  };

  const handleLeave = () => {
    Alert.alert(
      t("채팅방을 나갈까요?"),
      t("나가면 대화를 볼 수 없고, 다시 들어오려면 초대를 받아야 해요."),
      [
        { text: t("취소"), style: "cancel" },
        {
          text: t("나가기"),
          style: "destructive",
          onPress: () =>
            (kind === "room" ? leaveTeam : leaveLeader).mutate(undefined, {
              // 서랍과 채팅방을 함께 닫고 목록으로 돌아간다
              onSuccess: () => navigation.pop(2),
              onError: () => Alert.alert(t("나가지 못했어요"), t("잠시 후 다시 시도해주세요.")),
            }),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background-page">
      {/* 위: 뒤로 / 방 이름 / 알림 켜기·끄기 */}
      <View
        className="flex-row items-center justify-between px-5 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <PressableScale scaleTo={0.85} onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="back" size={28} color={colors.icon.strong} />
        </PressableScale>
        <Text
          className="mx-3 flex-1 text-center font-pretendard-semibold text-heading-small text-text-normal"
          numberOfLines={1}
        >
          {title}
        </Text>
        <PressableScale
          scaleTo={0.85}
          hitSlop={8}
          onPress={() => setMute.mutate(!muted)}
          accessibilityLabel={muted ? t("알림 켜기") : t("알림 끄기")}
        >
          <View>
            <Icon name="bell" size={28} color={muted ? colors.icon.normal : colors.icon.strong} />
            {/* 끈 상태 — 종 위에 사선 */}
            {muted && (
              <View
                pointerEvents="none"
                className="absolute bg-semantic-danger"
                style={{
                  width: 30,
                  height: 2,
                  top: 13,
                  left: -1,
                  transform: [{ rotate: "-45deg" }],
                }}
              />
            )}
          </View>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom, gap: 12 }}>
        {muted && (
          <Text className="px-5 text-caption-main text-text-alternative">
            {t("이 방 알림을 껐어요. 나를 언급하거나 공지가 올라오면 알림이 와요.")}
          </Text>
        )}

        {/* 사진/동영상 */}
        <View className="mx-5 gap-3 rounded-5 bg-background-normal py-4 shadow-card">
          <View className="flex-row items-center gap-3 px-4">
            <View className="h-7 w-7 items-center justify-center rounded-md bg-primary-normal">
              <Icon name="image" size={18} color="#FFFFFF" />
            </View>
            <Text className="text-body-medium text-text-normal">{t("사진/동영상")}</Text>
          </View>
          {mediaUrls.length === 0 ? (
            <Text className="px-4 text-body-small text-text-alternative">
              {t("아직 주고받은 사진이 없어요")}
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
            >
              {mediaUrls.map((url, index) => (
                <Pressable key={`${index}-${url}`} onPress={() => setViewerIndex(index)}>
                  <Image
                    source={{ uri: url }}
                    style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 배경 바꾸기 — 내 폰에서만 */}
        <View className="mx-5 gap-3 rounded-5 bg-background-normal px-4 py-4 shadow-card">
          <View>
            <Text className="text-body-medium text-text-normal">{t("배경 바꾸기")}</Text>
            <Text className="text-caption-main text-text-alternative">
              {t("내 폰에서만 바뀌어요")}
            </Text>
          </View>
          <ChatBackgroundPicker roomKey={`${kind}:${id}`} />
        </View>

        {/* 대화 상대 */}
        <View className="mx-5 gap-1 rounded-5 bg-background-normal py-4 shadow-card">
          <Text className="px-4 pb-2 text-body-medium text-text-normal">
            {t("대화 상대")} {(room?.members ?? []).length}
          </Text>
          {(room?.members ?? []).map((member) => (
            <View key={member.id} className="flex-row items-center gap-3 px-4 py-2">
              <Avatar imageUrl={member.avatarUrl} size={40} />
              {member.id === myId && (
                <View className="h-5 w-5 items-center justify-center rounded-full bg-text-normal">
                  <Text className="text-caption-main text-background-normal">{t("나")}</Text>
                </View>
              )}
              <Text className="text-body-medium text-text-normal">{member.name}</Text>
            </View>
          ))}
        </View>

        {(canManage || canLeave) && (
          <View className="mx-5 rounded-5 bg-background-normal shadow-card">
            {canManage && (
              <Pressable className="px-4 py-4 active:opacity-60" onPress={handleManage}>
                <Text className="text-body-medium text-text-normal">
                  {t("채팅방 관리 (이름·멤버)")}
                </Text>
              </Pressable>
            )}
            {canLeave && (
              <Pressable
                className={
                  canManage
                    ? "border-t border-background-assistive px-4 py-4 active:opacity-60"
                    : "px-4 py-4 active:opacity-60"
                }
                onPress={handleLeave}
              >
                <Text className="text-body-medium text-semantic-danger">{t("채팅방 나가기")}</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <ChatImageViewer
        urls={mediaUrls}
        startIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}
