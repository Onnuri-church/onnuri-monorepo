import { useNavigation } from "@react-navigation/native";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../../shared/components/base/Button";
import { Header } from "../../../shared/components/base/Header";
import { UnreadBadge } from "../../../shared/components/base/UnreadBadge";
import type { usePullToRefresh } from "../../../shared/hooks/usePullToRefresh";
import { colors } from "../../../shared/theme/tokens";
import { toTimeAgo } from "../../../shared/utils/date";

export interface ChatRoomListItem {
  id: string;
  name: string;
  memberCount: number;
  unreadCount: number;
  lastMessage: string | null;
  lastActivityAt: string;
}

interface ChatRoomListProps {
  title: string;
  rooms: ChatRoomListItem[];
  isLoading: boolean;
  pullRefresh: ReturnType<typeof usePullToRefresh>;
  /** 방을 만들고 지울 수 있는 사람 — 헤더에 ☰(만들기·삭제)가 보인다 */
  canManage: boolean;
  emptyText: string;
  onOpen: (roomId: string) => void;
  onCreate: () => void;
  /** 방 하나에서 나가기 — 실패하면 던진다 */
  onLeave: (roomId: string) => Promise<unknown>;
  /** 방 하나 삭제 — 실패하면 던진다 */
  onDelete: (roomId: string) => Promise<unknown>;
}

// 밀어서 드러나는 "나가기" 버튼 폭
const ACTION_WIDTH = 84;

function serverMessage(error: unknown): string | undefined {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

// 방 한 줄을 왼쪽으로 밀면 "나가기"만 나온다 (SCRUM-256, 카카오톡의 보관·나가기 중 나가기만).
function SwipeToLeave({
  enabled,
  onLeave,
  children,
}: {
  enabled: boolean;
  onLeave: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (!enabled) return <>{children}</>;
  return (
    <ReanimatedSwipeable
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          className="items-center justify-center active:opacity-70"
          style={{ width: ACTION_WIDTH, backgroundColor: colors.semantic.danger }}
          onPress={() => {
            methods.close();
            onLeave();
          }}
        >
          <Text className="text-body-small text-text-onImage">{t("나가기")}</Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

// 단톡방 목록 — 팀 단톡방과 전체 리더 방이 같이 쓴다 (셀·소그룹 채팅은 방이 따로 없어 목록이 없다).
// 누구나: 방을 왼쪽으로 밀어 나가기 (SCRUM-256).
// 만들고 지울 수 있는 사람: 헤더 ☰ → 만들기 / 삭제. 삭제를 고르면 방마다 체크 칸이 생기고,
// 고른 방을 한 번에 지운다 — 하나만 골라도 된다 (SCRUM-257).
export function ChatRoomList({
  title,
  rooms,
  isLoading,
  pullRefresh,
  canManage,
  emptyText,
  onOpen,
  onCreate,
  onLeave,
  onDelete,
}: ChatRoomListProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () =>
        selecting ? (
          <Header
            variant="sub"
            title={t("채팅방 삭제")}
            hideBack
            rightAction="text"
            rightLabel={t("취소")}
            onPressRightLabel={stopSelecting}
          />
        ) : canManage ? (
          <Header
            variant="sub"
            title={title}
            rightAction="chat"
            menuItems={[
              { icon: "plus", label: t("채팅방 만들기"), onPress: onCreate },
              {
                icon: "trash-can",
                label: t("채팅방 삭제"),
                danger: true,
                onPress: () => setSelecting(true),
              },
            ]}
          />
        ) : (
          <Header variant="sub" title={title} rightAction="none" />
        ),
    });
    // onCreate는 화면이 매번 새로 만들어 넘기므로 의존성에서 뺀다 — 넣으면 헤더를 매 렌더 다시 단다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, selecting, canManage, title, t]);

  const handleLeave = (room: ChatRoomListItem) => {
    Alert.alert(
      t("방에서 나갈까요?"),
      t("{{name}} 방에서 나가면 다시 초대받아야 들어올 수 있어요.", { name: room.name }),
      [
        { text: t("취소"), style: "cancel" },
        {
          text: t("나가기"),
          style: "destructive",
          onPress: () => {
            onLeave(room.id).catch((error: unknown) =>
              Alert.alert(
                t("나가지 못했어요"),
                serverMessage(error) ?? t("잠시 후 다시 시도해주세요."),
              ),
            );
          },
        },
      ],
    );
  };

  const toggle = (roomId: string) =>
    setSelected((prev) =>
      prev.includes(roomId) ? prev.filter((value) => value !== roomId) : [...prev, roomId],
    );

  const handleDelete = () => {
    if (selected.length === 0 || deleting) return;
    Alert.alert(
      t("{{count}}개 방을 삭제할까요?", { count: selected.length }),
      t("방과 대화 내용이 모든 멤버에게서 사라져요. 되돌릴 수 없어요."),
      [
        { text: t("취소"), style: "cancel" },
        {
          text: t("삭제"),
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            // 하나가 실패해도 나머지는 지운다 — 끝나고 실패한 개수만 알린다.
            const results = await Promise.allSettled(selected.map((roomId) => onDelete(roomId)));
            setDeleting(false);
            const failed = results.filter((result) => result.status === "rejected").length;
            stopSelecting();
            if (failed > 0) {
              Alert.alert(
                t("일부 방을 삭제하지 못했어요"),
                t("{{count}}개 방은 그대로 남아 있어요. 다시 시도해주세요.", { count: failed }),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background-normal">
      <FlatList
        data={rooms}
        keyExtractor={(room) => room.id}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={<RefreshControl {...pullRefresh} />}
        renderItem={({ item: room }) => {
          const checked = selected.includes(room.id);
          return (
            <SwipeToLeave enabled={!selecting} onLeave={() => handleLeave(room)}>
              <Pressable
                className="flex-row items-center bg-background-normal px-5 active:opacity-60"
                onPress={() => (selecting ? toggle(room.id) : onOpen(room.id))}
              >
                {/* 삭제할 방 고르기 — 왼쪽 체크 칸 */}
                {selecting && (
                  <View
                    className={
                      checked
                        ? "mr-3 h-5.5 w-5.5 items-center justify-center rounded-full bg-primary-normal"
                        : "mr-3 h-5.5 w-5.5 rounded-full border border-icon-normal bg-background-normal"
                    }
                  >
                    {checked && <Text className="text-caption-small text-text-disable">✓</Text>}
                  </View>
                )}
                <View className="flex-1 border-b border-background-assistive py-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-body-main text-text-normal" numberOfLines={1}>
                      {room.name}
                    </Text>
                    <UnreadBadge count={room.unreadCount} className="ml-2" />
                    <Text className="ml-2 text-caption-main text-text-alternative">
                      {toTimeAgo(room.lastActivityAt)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-body-small text-text-alternative" numberOfLines={1}>
                    {room.lastMessage ?? t("아직 대화가 없어요")} ·{" "}
                    {t("{{count}}명", { count: room.memberCount })}
                  </Text>
                </View>
              </Pressable>
            </SwipeToLeave>
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <Text className="mt-16 px-5 text-center text-body-medium text-text-alternative">
              {emptyText}
            </Text>
          )
        }
      />

      {selecting && (
        <View
          className="border-t border-background-muted bg-background-normal px-5 pt-3"
          style={{ paddingBottom: 12 + insets.bottom }}
        >
          <Button
            label={
              selected.length > 0
                ? t("{{count}}개 삭제", { count: selected.length })
                : t("삭제할 방을 골라주세요")
            }
            disabled={selected.length === 0}
            loading={deleting}
            onPress={handleDelete}
          />
        </View>
      )}
    </View>
  );
}
