import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";

import { signInForReview } from "../../../shared/api/session";
import { Button } from "../../../shared/components/base/Button";
import { TextField } from "../../../shared/components/base/TextField";

interface ReviewLoginModalProps {
  visible: boolean;
  onClose: () => void;
}

// 스토어 심사용 로그인 (SCRUM-197). 로그인 화면 로고를 5번 누르면 열린다 — 심사 정보에 방법과
// 아이디·비밀번호를 적어 둔다. 성공하면 세션이 생겨 RootNavigator가 알아서 화면을 넘긴다.
export function ReviewLoginModal({ visible, onClose }: ReviewLoginModalProps) {
  const { t } = useTranslation();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    setPassword("");
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signInForReview(id.trim(), password);
    } catch {
      setError(t("아이디 또는 비밀번호가 올바르지 않아요."));
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        // 위쪽에 붙인다 — 안드로이드 모달은 키보드가 올라와도 창이 줄지 않아 가운데 두면 버튼이 가려진다.
        className="flex-1 items-center bg-background-dark/50 px-6 pt-16"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="w-full gap-4 rounded-2xl bg-background-normal p-5">
          <Text className="text-heading-small text-text-normal">{t("심사용 로그인")}</Text>
          <TextField label={t("아이디")} placeholder={t("아이디")} value={id} onChangeText={setId} />
          <TextField
            label={t("비밀번호")}
            placeholder={t("비밀번호")}
            value={password}
            onChangeText={setPassword}
            secure
          />
          {error && <Text className="text-body-medium text-semantic-danger">{error}</Text>}
          <Button
            label={t("로그인")}
            onPress={() => void handleSubmit()}
            disabled={id.trim() === "" || password === ""}
            loading={submitting}
          />
          <Pressable className="items-center py-2" onPress={handleClose}>
            <Text className="text-body-medium text-text-alternative">{t("취소")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
