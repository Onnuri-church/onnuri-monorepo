import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 앨범에서 사진·동영상 고르기 */
  onPickMedia: () => void;
  /** 파일(악보·문서) 고르기 */
  onPickFile: () => void;
}

// 단톡방 + 버튼을 눌렀을 때 아래에서 올라오는 선택 — 앨범(사진·동영상) 또는 파일.
export function AttachmentSheet({ visible, onClose, onPickMedia, onPickFile }: AttachmentSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const options = [
    { label: t("사진·동영상"), description: t("앨범에서 고르기"), onPress: onPickMedia },
    { label: t("파일"), description: t("악보·문서 (10MB까지)"), onPress: onPickFile },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-background-dark/50" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-background-normal px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {options.map((option) => (
            <Pressable
              key={option.label}
              className="h-16 justify-center border-b border-background-assistive active:opacity-60"
              onPress={option.onPress}
            >
              <Text className="text-body-main text-text-normal">{option.label}</Text>
              <Text className="text-body-small text-text-alternative">{option.description}</Text>
            </Pressable>
          ))}
          <View className="pt-2">
            <Pressable className="h-12 items-center justify-center active:opacity-60" onPress={onClose}>
              <Text className="text-body-main text-text-alternative">{t("취소")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
