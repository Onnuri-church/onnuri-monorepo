import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../../shared/components/base/Icon";

interface CameraPreviewProps {
  /** 방금 찍은 사진 (없으면 닫혀 있다) */
  uri: string | null;
  onClose: () => void;
  /** 전송 — 설명(빈 문자열 가능)과 함께 보낸다 */
  onSend: (caption: string) => void;
}

// 카메라로 찍은 사진 미리보기 — 카카오톡처럼 검은 화면에 사진을 크게 보여주고,
// 왼쪽 위 ✕로 취소, 오른쪽 위 "전송"으로 바로 보낸다. 아래 칸에 간단한 설명을 붙일 수 있다 (SCRUM-228).
export function CameraPreview({ uri, onClose, onSend }: CameraPreviewProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState("");

  // 새 사진이 들어오면 설명을 비운다
  useEffect(() => {
    if (uri) setCaption("");
  }, [uri]);

  return (
    <Modal visible={uri !== null} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        style={{ backgroundColor: "#000000" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          className="flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable
            hitSlop={8}
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          >
            <Text className="text-heading-small text-text-onImage">✕</Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => onSend(caption)}
            className="h-11 items-center justify-center rounded-full px-5"
            style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          >
            <Text className="text-body-main text-text-onImage">{t("전송")}</Text>
          </Pressable>
        </View>

        <View className="flex-1 justify-center py-4">
          {uri && <Image source={{ uri }} className="h-full w-full" resizeMode="contain" />}
        </View>

        <View
          className="flex-row items-center gap-2 px-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Icon name="write" size={20} color="#9CA3AF" />
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={t("간단한 설명을 입력해 주세요.")}
            placeholderTextColor="#9CA3AF"
            className="flex-1 py-3 text-body-medium"
            style={{ color: "#FFFFFF" }}
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => onSend(caption)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
