import type { ChatPollInfo } from "@onnuri/shared";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import type { RootStackParamList } from "../../../shared/types/navigation";
import { useThemeColors } from "../../../shared/theme/useThemeColors";
import type { ChatKind } from "../api";

interface PollCardProps {
  poll: ChatPollInfo;
  kind: ChatKind;
  id: string;
  onLongPress: () => void;
}

// 채팅 안 투표 카드 (SCRUM-247) — 카카오톡처럼 "Q. 제목"과 항목 이름만 보여주고, 누르면 상세 화면으로 간다.
// 투표·결과·댓글은 상세 화면에서 한다 — 채팅을 넘기다 항목을 잘못 눌러 투표되는 일이 없게.
// 내가 고른 항목에는 체크가 붙는다.
export function PollCard({ poll, kind, id, onLongPress }: PollCardProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const voted = poll.options.some((option) => option.votedByMe);
  const open = () => navigation.navigate("ChatPollDetail", { kind, id, pollId: poll.id });

  return (
    <Pressable
      onPress={open}
      onLongPress={onLongPress}
      className="w-64 overflow-hidden rounded-2xl bg-background-normal active:opacity-80"
    >
      <View className="gap-3 px-4 pb-4 pt-3.5">
        <Text className="font-pretendard-semibold text-body-main text-text-normal">
          Q. {poll.title}
        </Text>
        <View className="gap-2.5">
          {poll.options.map((option) => (
            <Text
              key={option.id}
              className={
                option.votedByMe
                  ? "text-body-medium text-primary-normal"
                  : "text-body-medium text-text-normal"
              }
              numberOfLines={2}
            >
              {option.votedByMe ? "✓ " : ""}
              {option.text}
            </Text>
          ))}
        </View>
        <Text className="text-caption-main text-text-alternative">
          {[
            poll.closed ? t("마감됨") : null,
            t("{{count}}명 참여", { count: poll.voterCount }),
            poll.commentCount > 0 ? t("댓글 {{count}}", { count: poll.commentCount }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View className="flex-row items-center justify-between bg-background-muted px-4 py-3">
        <Text className="text-body-small text-text-normal">
          {poll.closed ? t("결과 보기") : voted ? t("투표 확인하기") : t("투표하러 가기")}
        </Text>
        <Icon name="expand-right" size={14} color={themeColors.icon.normal} />
      </View>
    </Pressable>
  );
}
