import type { ChatPollInfo } from "@onnuri/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../../shared/components/base/Avatar";
import { useThemeColors } from "../../../shared/theme/useThemeColors";
import {
  useAddChatPollOption,
  useCloseChatPoll,
  useVoteChatPoll,
  type ChatKind,
} from "../api";

interface PollCardProps {
  poll: ChatPollInfo;
  kind: ChatKind;
  id: string;
  onLongPress: () => void;
}

function formatClosesAt(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 채팅 안 투표 카드 — 항목마다 득표 막대와 수가 보이고, 누르면 바로 투표한다 (다시 누르면 취소·변경).
// 단일 선택은 다른 항목을 누르면 옮겨 가고, 복수 선택은 여러 개를 켤 수 있다. 마감되면 결과만 보인다.
export function PollCard({ poll, kind, id, onLongPress }: PollCardProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const vote = useVoteChatPoll(kind, id);
  const addOption = useAddChatPollOption(kind, id);
  const close = useCloseChatPoll(kind, id);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [votersOpen, setVotersOpen] = useState(false);

  const maxCount = Math.max(1, ...poll.options.map((option) => option.count));
  const myIds = poll.options.filter((option) => option.votedByMe).map((option) => option.id);

  const handleOptionPress = (optionId: string) => {
    if (poll.closed) return;
    const selected = myIds.includes(optionId);
    let next: string[];
    if (poll.multiple) {
      next = selected ? myIds.filter((item) => item !== optionId) : [...myIds, optionId];
    } else {
      next = selected ? [] : [optionId];
    }
    vote.mutate(
      { pollId: poll.id, optionIds: next },
      { onError: () => Alert.alert(t("투표하지 못했어요"), t("잠시 후 다시 시도해주세요.")) },
    );
  };

  const handleAddOption = () => {
    const text = draft.trim();
    if (!text) return;
    addOption.mutate(
      { pollId: poll.id, text },
      {
        onSuccess: () => {
          setDraft("");
          setAdding(false);
        },
        onError: () => Alert.alert(t("항목을 추가하지 못했어요"), t("잠시 후 다시 시도해주세요.")),
      },
    );
  };

  const handleClosePress = () => {
    Alert.alert(t("투표를 마감할까요?"), t("마감하면 더 이상 투표할 수 없어요."), [
      { text: t("취소"), style: "cancel" },
      { text: t("마감"), style: "destructive", onPress: () => close.mutate(poll.id) },
    ]);
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      className="w-72 gap-3 rounded-2xl border border-background-assistive bg-background-normal p-4"
    >
      <View className="flex-row items-center gap-2">
        <Text className="text-caption-main text-primary-normal">{t("투표")}</Text>
        {poll.closed ? (
          <Text className="text-caption-main text-text-alternative">{t("마감됨")}</Text>
        ) : poll.closesAt ? (
          <Text className="text-caption-main text-text-alternative">
            {t("{{time}} 마감", { time: formatClosesAt(poll.closesAt) })}
          </Text>
        ) : null}
        {poll.anonymous && (
          <Text className="text-caption-main text-text-alternative">{t("익명")}</Text>
        )}
        {poll.multiple && (
          <Text className="text-caption-main text-text-alternative">{t("복수 선택")}</Text>
        )}
      </View>

      <Text className="text-body-main text-text-normal">{poll.title}</Text>

      <View className="gap-2">
        {poll.options.map((option) => (
          <Pressable
            key={option.id}
            disabled={poll.closed}
            onPress={() => handleOptionPress(option.id)}
            className="overflow-hidden rounded-xl border border-background-assistive active:opacity-70"
            style={option.votedByMe ? { borderColor: themeColors.primary.normal } : undefined}
          >
            {/* 득표 비율 막대 */}
            <View
              className="absolute bottom-0 left-0 top-0 bg-background-alternative"
              style={{ width: `${(option.count / maxCount) * 100}%` }}
            />
            <View className="flex-row items-center justify-between px-3 py-2.5">
              <Text
                className={
                  option.votedByMe
                    ? "flex-1 text-body-main text-primary-normal"
                    : "flex-1 text-body-main text-text-normal"
                }
              >
                {option.votedByMe ? "✓ " : ""}
                {option.text}
              </Text>
              <Text className="ml-2 text-body-small text-text-neutral">{option.count}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {!poll.closed && poll.allowAddOptions && (
        adding ? (
          <View className="flex-row items-center gap-2">
            <TextInput
              className="h-10 flex-1 rounded-xl bg-background-muted px-3 text-body-small text-text-normal"
              value={draft}
              onChangeText={setDraft}
              placeholder={t("추가할 항목")}
              placeholderTextColor={themeColors.text.alternative}
              maxLength={50}
              autoFocus
              onSubmitEditing={handleAddOption}
            />
            <Pressable onPress={handleAddOption} hitSlop={8}>
              <Text className="text-body-small text-primary-normal">{t("추가")}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setAdding(true)} hitSlop={8}>
            <Text className="text-body-small text-text-alternative">+ {t("항목 추가")}</Text>
          </Pressable>
        )
      )}

      <View className="flex-row items-center justify-between">
        <Pressable
          disabled={poll.anonymous || poll.voterCount === 0}
          onPress={() => setVotersOpen(true)}
          hitSlop={8}
        >
          <Text className="text-body-small text-text-alternative">
            {t("{{count}}명 참여", { count: poll.voterCount })}
            {!poll.anonymous && poll.voterCount > 0 ? " ›" : ""}
          </Text>
        </Pressable>
        {poll.canClose && (
          <Pressable onPress={handleClosePress} hitSlop={8}>
            <Text className="text-body-small text-semantic-danger">{t("마감하기")}</Text>
          </Pressable>
        )}
      </View>

      {/* 누가 어디에 투표했는지 — 익명 투표는 열리지 않는다 */}
      <Modal
        visible={votersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVotersOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-background-dark/50"
          onPress={() => setVotersOpen(false)}
        >
          <Pressable
            className="max-h-[70%] rounded-t-3xl bg-background-normal px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <Text className="text-heading-small text-text-normal">{poll.title}</Text>
            <ScrollView className="mt-3">
              {poll.options.map((option) => (
                <View key={option.id} className="py-2">
                  <Text className="text-body-main text-text-normal">
                    {option.text} · {option.count}
                  </Text>
                  {option.voters.length === 0 ? (
                    <Text className="mt-1 text-body-small text-text-alternative">
                      {t("아직 아무도 없어요")}
                    </Text>
                  ) : (
                    option.voters.map((voter) => (
                      <View key={voter.id} className="mt-2 flex-row items-center gap-2">
                        <Avatar imageUrl={voter.avatarUrl} size={28} />
                        <Text className="text-body-small text-text-neutral">{voter.name}</Text>
                      </View>
                    ))
                  )}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}
