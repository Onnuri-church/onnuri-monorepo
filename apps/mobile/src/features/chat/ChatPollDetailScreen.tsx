import { type RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../shared/components/base/Avatar";
import { Button } from "../../shared/components/base/Button";
import { Icon } from "../../shared/components/base/Icon";
import { useKeyboardHeight } from "../../shared/hooks/useKeyboardHeight";
import { useThemeColors } from "../../shared/theme/useThemeColors";
import type { RootStackParamList } from "../../shared/types/navigation";
import { toTimeAgo } from "../../shared/utils/date";
import { useBlockedUserIds } from "../block/api";
import { useMe } from "../profile/useMe";
import { useReport } from "../report/useReport";
import {
  useChatPoll,
  useChatPollActions,
  useChatPollCommentActions,
  useChatPollComments,
} from "./api";

function formatClosesAt(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((value) => b.includes(value));
}

// 투표 상세 (SCRUM-247) — 채팅의 투표 카드를 누르면 온다. 항목을 고르고 "투표하기"를 눌러야 반영된다
// (카드에서 바로 투표되던 예전 방식은 잘못 누르기 쉬웠다). 아래에 참여자·마감·댓글이 있다.
// 마감된 투표는 결과만 보이고, 댓글은 계속 달 수 있다.
export function ChatPollDetailScreen() {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { kind, id, pollId } = useRoute<RouteProp<RootStackParamList, "ChatPollDetail">>().params;
  const { data: poll, isError } = useChatPoll(kind, id, pollId);
  const { vote, addOption, close } = useChatPollActions(kind, id, pollId);
  const { data: comments } = useChatPollComments(pollId);
  const { add: addComment, remove: removeComment } = useChatPollCommentActions(kind, id, pollId);
  const blockedIds = useBlockedUserIds();
  // 남의 댓글에는 신고 버튼을 둔다 (SCRUM-248) — 사용자 글에는 어디든 신고 수단이 있어야 한다.
  const myId = useMe()?.id;
  const { openReport, sheet: reportSheet } = useReport();

  const myIds = useMemo(
    () => (poll?.options ?? []).filter((option) => option.votedByMe).map((option) => option.id),
    [poll],
  );
  // 화면에서 고른 항목 — "투표하기"를 누르기 전까지는 서버에 안 간다.
  const [selected, setSelected] = useState<string[] | null>(null);
  const picked = selected ?? myIds;
  // 서버 값이 내가 고른 것과 같아지면(투표 반영) 화면 선택을 내려놓는다.
  useEffect(() => {
    if (selected && sameIds(selected, myIds)) setSelected(null);
  }, [selected, myIds]);

  const [addingOption, setAddingOption] = useState(false);
  const [optionDraft, setOptionDraft] = useState("");
  const [votersOpen, setVotersOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  // 댓글을 쓰려고 키보드를 올리면 마지막 댓글이 입력줄 바로 위에 보이게 맨 아래로 맞춘다 (SCRUM-247).
  // 키보드 때문에 목록 칸이 줄어드는 바로 그 순간(onLayout)에 움직임 없이 맞춘다 — 예전엔 조금 기다렸다가
  // 천천히 내려가서 늦게 따라오는 것처럼 보였다. 항목 추가 입력칸의 키보드에는 맞추지 않는다
  // (그 칸이 화면 밖으로 밀려난다).
  const scrollRef = useRef<ScrollView>(null);
  const commentFocused = useRef(false);
  // 댓글을 남긴 직후 — 새 댓글이 그려져 목록이 길어지는 순간에 맨 아래로 내린다.
  const scrollAfterSend = useRef(false);

  if (!poll) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        {isError ? (
          <Text className="text-body-medium text-text-alternative">
            {t("투표를 불러오지 못했어요")}
          </Text>
        ) : (
          <ActivityIndicator color={themeColors.primary.normal} />
        )}
      </View>
    );
  }

  const maxCount = Math.max(1, ...poll.options.map((option) => option.count));
  const changed = !sameIds(picked, myIds);
  const hasVoted = myIds.length > 0;

  const handleOptionPress = (optionId: string) => {
    if (poll.closed) return;
    const on = picked.includes(optionId);
    if (poll.multiple) {
      setSelected(on ? picked.filter((item) => item !== optionId) : [...picked, optionId]);
    } else {
      setSelected(on ? [] : [optionId]);
    }
  };

  const handleVote = () => {
    vote.mutate(picked, {
      onError: () => {
        setSelected(null);
        Alert.alert(t("투표하지 못했어요"), t("잠시 후 다시 시도해주세요."));
      },
    });
  };

  const handleAddOption = () => {
    const text = optionDraft.trim();
    if (!text) return;
    addOption.mutate(text, {
      onSuccess: () => {
        setOptionDraft("");
        setAddingOption(false);
      },
      onError: () => Alert.alert(t("항목을 추가하지 못했어요"), t("잠시 후 다시 시도해주세요.")),
    });
  };

  const handleClosePress = () => {
    Alert.alert(t("투표를 마감할까요?"), t("마감하면 더 이상 투표할 수 없어요."), [
      { text: t("취소"), style: "cancel" },
      { text: t("마감"), style: "destructive", onPress: () => close.mutate() },
    ]);
  };

  const handleSendComment = () => {
    const content = commentDraft.trim();
    if (!content || addComment.isPending) return;
    addComment.mutate(content, {
      onSuccess: () => {
        setCommentDraft("");
        scrollAfterSend.current = true;
      },
      onError: () => Alert.alert(t("댓글을 남기지 못했어요"), t("잠시 후 다시 시도해주세요.")),
    });
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(t("댓글을 삭제할까요?"), undefined, [
      { text: t("취소"), style: "cancel" },
      { text: t("삭제"), style: "destructive", onPress: () => removeComment.mutate(commentId) },
    ]);
  };

  const visibleComments = (comments ?? []).filter((comment) => !blockedIds.has(comment.authorId));
  const tags = [poll.anonymous ? t("익명") : null, poll.multiple ? t("복수 선택") : null].filter(
    Boolean,
  );

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        ref={scrollRef}
        onLayout={() => {
          if (commentFocused.current) scrollRef.current?.scrollToEnd({ animated: false });
        }}
        onContentSizeChange={() => {
          if (!scrollAfterSend.current) return;
          scrollAfterSend.current = false;
          scrollRef.current?.scrollToEnd({ animated: true });
        }}
        contentContainerClassName="px-5 pb-4 pt-4"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="overflow-hidden rounded-2xl border border-background-assistive">
          {/* 마감 안내 줄 */}
          <View className="flex-row items-center gap-2 bg-background-muted px-4 py-2.5">
            <Text className="flex-1 text-body-small text-text-neutral">
              {poll.closed
                ? t("마감된 투표예요")
                : poll.closesAt
                  ? t("{{time}}에 마감돼요", { time: formatClosesAt(poll.closesAt) })
                  : t("진행 중인 투표예요")}
            </Text>
            {tags.length > 0 && (
              <Text className="text-caption-main text-text-alternative">{tags.join(" · ")}</Text>
            )}
          </View>

          <View className="gap-4 p-4">
            <Text className="text-heading-small text-text-normal">{poll.title}</Text>

            <View className="gap-2">
              {poll.options.map((option) => {
                const on = picked.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    disabled={poll.closed}
                    onPress={() => handleOptionPress(option.id)}
                    className="overflow-hidden rounded-xl border border-background-assistive active:opacity-70"
                    style={on ? { borderColor: themeColors.primary.normal } : undefined}
                  >
                    {/* 득표 비율 막대 */}
                    <View
                      className="absolute bottom-0 left-0 top-0 bg-background-alternative"
                      style={{ width: `${(option.count / maxCount) * 100}%` }}
                    />
                    <View className="flex-row items-center gap-3 px-3 py-3">
                      {/* 고르는 동그라미 — 마감되면 내가 고른 항목에만 체크가 남는다 */}
                      {on ? (
                        <View className="h-5.5 w-5.5 items-center justify-center rounded-full bg-primary-normal">
                          <Text className="text-caption-small text-text-disable">✓</Text>
                        </View>
                      ) : (
                        !poll.closed && (
                          <View className="h-5.5 w-5.5 rounded-full border border-icon-normal bg-background-normal" />
                        )
                      )}
                      <Text
                        className={
                          on
                            ? "flex-1 text-body-main text-primary-normal"
                            : "flex-1 text-body-medium text-text-normal"
                        }
                      >
                        {option.text}
                      </Text>
                      <Text className="text-body-small text-text-neutral">
                        {t("{{count}}명", { count: option.count })}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {!poll.closed &&
              poll.allowAddOptions &&
              (addingOption ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="h-10 flex-1 rounded-xl bg-background-muted px-3 text-body-small text-text-normal"
                    value={optionDraft}
                    onChangeText={setOptionDraft}
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
                <Pressable onPress={() => setAddingOption(true)} hitSlop={8}>
                  <Text className="text-body-small text-text-alternative">+ {t("항목 추가")}</Text>
                </Pressable>
              ))}

            {!poll.closed && (
              <Button
                label={
                  hasVoted
                    ? changed && picked.length === 0
                      ? t("투표 취소하기")
                      : t("다시 투표하기")
                    : t("투표하기")
                }
                disabled={!changed}
                loading={vote.isPending}
                onPress={handleVote}
              />
            )}

            <View className="flex-row items-center justify-between">
              {poll.canClose ? (
                <Pressable onPress={handleClosePress} hitSlop={8}>
                  <Text className="text-body-small text-semantic-danger">{t("마감하기")}</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable
                disabled={poll.anonymous || poll.voterCount === 0}
                onPress={() => setVotersOpen(true)}
                hitSlop={8}
                className="flex-row items-center gap-1"
              >
                <Text className="text-body-small text-text-neutral">
                  {t("{{count}}명 참여", { count: poll.voterCount })}
                </Text>
                {!poll.anonymous && poll.voterCount > 0 && (
                  <Icon name="expand-right" size={12} color={themeColors.icon.normal} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* 댓글 */}
        <Text className="mb-1 mt-7 text-body-main text-text-normal">
          {t("댓글 {{count}}", { count: visibleComments.length })}
        </Text>
        {visibleComments.length === 0 ? (
          <Text className="py-6 text-center text-body-small text-text-alternative">
            {t("첫 댓글을 남겨보세요")}
          </Text>
        ) : (
          visibleComments.map((comment) => (
            <View key={comment.id} className="flex-row gap-3 py-3">
              <Avatar imageUrl={comment.authorAvatarUrl} size={36} />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-body-small text-text-normal">{comment.authorName}</Text>
                  <Text className="text-caption-main text-text-alternative">
                    {toTimeAgo(comment.createdAt)}
                  </Text>
                  <View className="ml-auto flex-row items-center gap-3">
                    {comment.authorId !== myId && (
                      <Pressable
                        hitSlop={8}
                        onPress={() =>
                          openReport({ targetType: "CHAT_POLL_COMMENT", targetId: comment.id })
                        }
                      >
                        <Text className="text-caption-main text-text-alternative">{t("신고")}</Text>
                      </Pressable>
                    )}
                    {comment.canDelete && (
                      <Pressable hitSlop={8} onPress={() => handleDeleteComment(comment.id)}>
                        <Text className="text-caption-main text-text-alternative">{t("삭제")}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
                <Text className="mt-1 text-body-medium text-text-normal">{comment.content}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 댓글 입력줄 — 키보드 위에 붙는다 */}
      <View
        className="flex-row items-center gap-2 border-t border-background-assistive bg-background-normal px-5 pt-2"
        style={{ paddingBottom: (keyboardHeight || insets.bottom) + 8 }}
      >
        <TextInput
          className="h-10 flex-1 rounded-full bg-background-muted px-4 text-body-small text-text-normal"
          value={commentDraft}
          onChangeText={setCommentDraft}
          onFocus={() => {
            commentFocused.current = true;
          }}
          onBlur={() => {
            commentFocused.current = false;
          }}
          placeholder={t("댓글을 남겨보세요")}
          placeholderTextColor={themeColors.text.alternative}
          maxLength={300}
          returnKeyType="send"
          onSubmitEditing={handleSendComment}
        />
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-full bg-background-alternative active:opacity-60"
          disabled={commentDraft.trim() === "" || addComment.isPending}
          onPress={handleSendComment}
          accessibilityLabel={t("등록")}
        >
          <Icon
            name="send-fill"
            size={20}
            color={
              commentDraft.trim() === "" ? themeColors.icon.normal : themeColors.primary.normal
            }
          />
        </Pressable>
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

      {reportSheet}
    </View>
  );
}
