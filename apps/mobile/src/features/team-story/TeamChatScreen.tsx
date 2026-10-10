import { useIsFocused, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeleteTeamMessage, useSendTeamMessage, useTeam, useTeamMessages } from "./api";
import { Avatar } from "../../shared/components/base/Avatar";
import { Header } from "../../shared/components/base/Header";
import { CommentInput } from "../../shared/components/composed/CommentInput";
import { useKeyboardHeight } from "../../shared/hooks/useKeyboardHeight";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";

// 팀 단톡 — 그 팀 팀원과 관리자만 들어온다. 화면이 열려 있는 동안 몇 초마다 새 글을 받아오고,
// 새 메시지가 오면 맨 아래로 따라간다. 내 메시지는 길게 누르면(관리자는 모든 메시지) 삭제할 수 있다.
export function TeamChatScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamChat">>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const focused = useIsFocused();
  const team = useTeam(params.teamId);
  const { data: messages } = useTeamMessages(params.teamId, focused);
  const send = useSendTeamMessage(params.teamId);
  const remove = useDeleteTeamMessage(params.teamId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const lastCount = useRef(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <Header
          variant="sub"
          title={t("{{name}} 단톡방", { name: team?.name ?? t("팀") })}
          rightAction="none"
        />
      ),
    });
  }, [navigation, team?.name, t]);

  const handleSubmit = () => {
    const content = draft.trim();
    if (!content || send.isPending) return;
    send.mutate(content, { onSuccess: () => setDraft("") });
  };

  const handleDeletePress = (messageId: string) => {
    Alert.alert(t("메시지를 삭제할까요?"), undefined, [
      { text: t("취소"), style: "cancel" },
      { text: t("삭제"), style: "destructive", onPress: () => remove.mutate(messageId) },
    ]);
  };

  const list = messages ?? [];

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="gap-3 px-5 py-4"
        keyboardShouldPersistTaps="handled"
        // 새 메시지가 생겼을 때만 맨 아래로 간다 — 같은 내용을 다시 받을 때는 위치를 건드리지 않는다.
        onContentSizeChange={() => {
          if (list.length !== lastCount.current) {
            lastCount.current = list.length;
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
      >
        {list.length === 0 && (
          <Text className="pt-10 text-center text-body-medium text-text-alternative">
            {t("아직 대화가 없어요. 첫 메시지를 남겨보세요.")}
          </Text>
        )}
        {list.map((message) =>
          message.isMine ? (
            <View key={message.id} className="items-end">
              <Text
                className="max-w-[75%] rounded-2xl bg-primary-normal px-3 py-2 text-body-medium text-text-onImage"
                onLongPress={() => handleDeletePress(message.id)}
              >
                {message.content}
              </Text>
              <Text className="mt-1 text-caption-main text-text-alternative">
                {toTimeAgo(message.createdAt)}
              </Text>
            </View>
          ) : (
            <View key={message.id} className="flex-row items-start gap-2">
              <Avatar imageUrl={message.authorAvatarUrl} size={36} />
              <View className="max-w-[75%] items-start">
                <Text className="text-body-small text-text-neutral">{message.authorName}</Text>
                <Text
                  className="mt-1 rounded-2xl bg-background-muted px-3 py-2 text-body-medium text-text-normal"
                  onLongPress={message.canDelete ? () => handleDeletePress(message.id) : undefined}
                >
                  {message.content}
                </Text>
                <Text className="mt-1 text-caption-main text-text-alternative">
                  {toTimeAgo(message.createdAt)}
                </Text>
              </View>
            </View>
          ),
        )}
      </ScrollView>

      <View
        className="px-5 pt-3"
        style={{ paddingBottom: (keyboardHeight || insets.bottom) + 8 }}
      >
        <CommentInput
          value={draft}
          onChangeText={setDraft}
          onSubmit={handleSubmit}
          placeholder={t("메시지를 입력하세요")}
        />
      </View>
    </View>
  );
}
