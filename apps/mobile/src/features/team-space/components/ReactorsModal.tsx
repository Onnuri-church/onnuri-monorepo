import type { TeamBoardReactor } from "@onnuri/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../../shared/components/base/Avatar";

interface ReactorsModalProps {
  visible: boolean;
  reactors: TeamBoardReactor[];
  onClose: () => void;
}

// 누가 어떤 이모지를 달았는지 — 위쪽 칩으로 이모지별로 걸러 볼 수 있다 (밴드의 "표정" 목록).
export function ReactorsModal({ visible, reactors, onClose }: ReactorsModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<string | null>(null);

  const emojis = Array.from(new Set(reactors.map((reactor) => reactor.emoji)));
  const rows = filter ? reactors.filter((reactor) => reactor.emoji === filter) : reactors;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-background-dark/50" onPress={onClose}>
        <Pressable
          className="max-h-[70%] rounded-t-3xl bg-background-normal px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Text className="text-heading-small text-text-normal">
            {t("표정 {{count}}", { count: reactors.length })}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setFilter(null)}
              className={
                filter === null
                  ? "rounded-full border border-primary-normal bg-background-alternative px-3 py-1"
                  : "rounded-full border border-background-assistive px-3 py-1"
              }
            >
              <Text className="text-body-small text-text-normal">{t("전체")} {reactors.length}</Text>
            </Pressable>
            {emojis.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setFilter(emoji)}
                className={
                  filter === emoji
                    ? "rounded-full border border-primary-normal bg-background-alternative px-3 py-1"
                    : "rounded-full border border-background-assistive px-3 py-1"
                }
              >
                <Text className="text-body-small text-text-normal">
                  {emoji} {reactors.filter((reactor) => reactor.emoji === emoji).length}
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView className="mt-3">
            {rows.map((reactor) => (
              <View
                key={`${reactor.userId}-${reactor.emoji}`}
                className="flex-row items-center justify-between border-b border-background-assistive py-3"
              >
                <View className="flex-row items-center gap-3">
                  <Avatar imageUrl={reactor.avatarUrl} size={40} />
                  <Text className="text-body-main text-text-normal">{reactor.name}</Text>
                </View>
                <Text className="text-heading-small">{reactor.emoji}</Text>
              </View>
            ))}
            {rows.length === 0 && (
              <Text className="py-8 text-center text-body-small text-text-alternative">
                {t("아직 표정을 단 사람이 없어요.")}
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
