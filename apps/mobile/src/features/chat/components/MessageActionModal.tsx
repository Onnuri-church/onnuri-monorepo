import { CHAT_EMOJIS, type ChatMessageInfo } from "@onnuri/shared";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MessageActionModalProps {
  message: ChatMessageInfo | null;
  canNotice: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onToggleNotice: () => void;
  onDelete: () => void;
}

// 메시지를 길게 눌렀을 때 아래에서 올라오는 메뉴 — 이모지 반응 줄 + 답장·공지·삭제.
export function MessageActionModal({
  message,
  canNotice,
  onClose,
  onReact,
  onReply,
  onToggleNotice,
  onDelete,
}: MessageActionModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const rows: { label: string; onPress: () => void; danger?: boolean }[] = [];
  if (message) {
    rows.push({ label: t("답장"), onPress: onReply });
    if (canNotice) {
      rows.push({
        label: message.isNotice ? t("공지 해제") : t("공지로 등록"),
        onPress: onToggleNotice,
      });
    }
    if (message.canDelete) rows.push({ label: t("삭제"), onPress: onDelete, danger: true });
  }

  return (
    <Modal visible={message !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-background-dark/50" onPress={onClose}>
        {/* 안쪽 탭이 바깥 닫기로 새지 않게 Pressable로 감싼다 */}
        <Pressable
          className="rounded-t-3xl bg-background-normal px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="flex-row justify-between pb-3">
            {CHAT_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                className="h-12 w-12 items-center justify-center rounded-full bg-background-muted active:opacity-60"
                onPress={() => onReact(emoji)}
              >
                <Text className="text-heading-medium">{emoji}</Text>
              </Pressable>
            ))}
          </View>
          {rows.map((row) => (
            <Pressable
              key={row.label}
              className="h-12 justify-center border-t border-background-assistive active:opacity-60"
              onPress={row.onPress}
            >
              <Text
                className={
                  row.danger
                    ? "text-body-main text-semantic-danger"
                    : "text-body-main text-text-normal"
                }
              >
                {row.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
