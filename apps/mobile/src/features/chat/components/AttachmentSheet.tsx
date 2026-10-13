import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "../../../shared/components/base/Icon";

interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 앨범에서 사진·동영상 고르기 */
  onPickMedia: () => void;
  /** 파일(악보·문서) 고르기 */
  onPickFile: () => void;
  /** 투표 만들기 */
  onPickPoll: () => void;
}

interface AttachmentRow {
  icon: IconName;
  /** 아이콘 칸 배경색 — 카카오톡처럼 종류마다 다른 색 */
  color: string;
  label: string;
  onPress: () => void;
}

// 단톡방 + 버튼을 눌렀을 때 아래에서 올라오는 목록 — 카카오톡처럼 색 아이콘과 짧은 글자 한 줄씩.
// 같은 성격끼리 구분선으로 묶는다 (사진·동영상 / 파일 / 투표).
export function AttachmentSheet({
  visible,
  onClose,
  onPickMedia,
  onPickFile,
  onPickPoll,
}: AttachmentSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const groups: AttachmentRow[][] = [
    [{ icon: "image", color: "#3FA55B", label: t("사진·동영상"), onPress: onPickMedia }],
    [{ icon: "paperclip", color: "#8A93A6", label: t("파일"), onPress: onPickFile }],
    [{ icon: "poll", color: "#F2A33A", label: t("투표"), onPress: onPickPoll }],
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-background-dark/50" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-background-normal pt-3"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* 시트 손잡이 */}
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-background-assistive" />
          {groups.map((rows, groupIndex) => (
            <View
              key={groupIndex}
              className={
                groupIndex > 0 ? "border-t border-background-assistive" : undefined
              }
            >
              {rows.map((row) => (
                <Pressable
                  key={row.label}
                  className="h-16 flex-row items-center gap-4 px-5 active:bg-background-muted"
                  onPress={row.onPress}
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: row.color }}
                  >
                    <Icon name={row.icon} size={22} color="#FFFFFF" />
                  </View>
                  <Text className="text-body-medium text-text-normal">{row.label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
