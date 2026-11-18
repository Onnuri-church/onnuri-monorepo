import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import {
  CHAT_BACKGROUNDS,
  type ChatBackgroundId,
  useChatBackgroundStore,
} from "../../../shared/store/useChatBackgroundStore";
import { useThemeStore } from "../../../shared/store/useThemeStore";

interface ChatBackgroundPickerProps {
  /** "room:<id>"처럼 방 종류와 id를 붙인 키 */
  roomKey: string;
}

// 채팅방 배경색 고르기 — 동그란 색 칩을 누르면 바로 바뀐다. 내 폰에만 저장된다 (SCRUM-229).
export function ChatBackgroundPicker({ roomKey }: ChatBackgroundPickerProps) {
  const { t } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  const selected = useChatBackgroundStore((state) => state.byRoom[roomKey]) ?? "default";
  const setBackground = useChatBackgroundStore((state) => state.setBackground);

  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-3">
      {(Object.keys(CHAT_BACKGROUNDS) as ChatBackgroundId[]).map((id) => {
        const option = CHAT_BACKGROUNDS[id];
        const active = id === selected;
        return (
          <Pressable
            key={id}
            onPress={() => setBackground(roomKey, id)}
            className="items-center gap-1"
            accessibilityLabel={t(option.label)}
            accessibilityState={{ selected: active }}
          >
            <View
              className={
                active
                  ? "h-12 w-12 items-center justify-center rounded-full border-2 border-primary-normal"
                  : "h-12 w-12 items-center justify-center rounded-full border border-background-assistive"
              }
              style={{ backgroundColor: option[mode] }}
            >
              {active && <Icon name="check" size={20} />}
            </View>
            <Text className="text-caption-main text-text-alternative">{t(option.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
