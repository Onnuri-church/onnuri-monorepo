import { BOARD_EMOJIS, type PostReactionSummary } from "@onnuri/shared";
import { useState } from "react";
import { Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { PressableScale } from "../../../shared/components/base/PressableScale";

interface ReactionBarProps {
  reactions: PostReactionSummary[];
  /** 이모지를 눌렀을 때 — 이미 단 이모지면 서버가 취소로 처리한다 */
  onReact: (emoji: string) => void;
}

// 부서활동 글의 이모지 줄 — 이미 달린 이모지는 "👍 2" 칩으로 개수와 함께 나열되고(누르면 나도 달거나 취소),
// 맨 끝 "+" 동그라미를 누르면 고를 수 있는 이모지 막대가 열린다. 누가 달았는지는 보여주지 않는다.
export function ReactionBar({ reactions, onReact }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePick = (emoji: string) => {
    setPickerOpen(false);
    onReact(emoji);
  };

  return (
    <View className="mt-5">
      <View className="flex-row flex-wrap items-center gap-2">
        {reactions.map((reaction) => (
          <PressableScale
            scaleTo={0.9}
            key={reaction.emoji}
            onPress={() => onReact(reaction.emoji)}
            className={
              reaction.reactedByMe
                ? "flex-row items-center gap-1.5 rounded-full border border-primary-normal bg-background-alternative px-3 py-1.5"
                : "flex-row items-center gap-1.5 rounded-full bg-background-muted px-3 py-1.5"
            }
          >
            <Text className="text-body-main">{reaction.emoji}</Text>
            <Text className="text-body-main text-text-normal">{reaction.count}</Text>
          </PressableScale>
        ))}
        <PressableScale
          scaleTo={0.9}
          onPress={() => setPickerOpen((prev) => !prev)}
          className="h-9 w-9 items-center justify-center rounded-full bg-background-muted"
          hitSlop={4}
        >
          <Icon name="add-round-light" size={22} />
        </PressableScale>
      </View>

      {pickerOpen && (
        <View className="mt-2 flex-row items-center gap-1 self-start rounded-full bg-background-normal px-2 py-1.5 shadow-dropdown">
          {BOARD_EMOJIS.map((emoji) => (
            <PressableScale
              scaleTo={0.9}
              key={emoji}
              onPress={() => handlePick(emoji)}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-background-muted"
            >
              <Text className="text-heading-medium">{emoji}</Text>
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );
}
