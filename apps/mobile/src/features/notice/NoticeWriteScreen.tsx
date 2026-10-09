import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { uploadImage } from "../../shared/api/upload";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageSlot } from "../../shared/components/base/ImageSlot";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCreateNotice } from "./api";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";

// 공지 등록 (관리자 전용, 자체 디자인 — 시안 없음). 내용이나 사진 중 하나는 있어야 한다
// (포스터 한 장짜리 공지도 되고, 글만 있는 공지도 된다 — 서버도 같은 규칙).
export function NoticeWriteScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const createNotice = useCreateNotice();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit =
    !saving && title.trim() !== "" && (content.trim() !== "" || photoUri !== null);

  const handlePhotoUploadPress = async () => {
    // 시스템 포토 피커라 별도 권한 요청이 필요 없다 (셀 커버 업로드와 동일).
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    setPhotoUri(result.assets[0].uri);
  };

  const handleSubmitPress = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const imageUrl = photoUri ? await uploadImage(photoUri) : undefined;
      await createNotice.mutateAsync({
        title: title.trim(),
        ...(content.trim() !== "" && { content: content.trim() }),
        ...(imageUrl && { imageUrl }),
      });
      navigation.goBack();
    } catch {
      Alert.alert(t("등록 실패"), t("잠시 후 다시 시도해주세요."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-6 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label={t("제목")}
            placeholder={t("공지 제목을 입력하세요.")}
            value={title}
            onChangeText={setTitle}
          />

          <View>
            <TextAreaField
              label={t("내용")}
              placeholder={t("공지 내용을 입력하세요.")}
              value={content}
              onChangeText={setContent}
            />
          </View>

          <View>
            <Field label={t("사진(선택)")}>
              <View className="h-43">
                <ImageSlot
                  imageUri={photoUri}
                  outline
                  onUploadPress={handlePhotoUploadPress}
                  onDeletePress={() => setPhotoUri(null)}
                />
              </View>
            </Field>
            <Text className="mt-2 text-caption-main text-text-alternative">
              {t("내용 없이 포스터 사진만으로도 등록할 수 있어요")}
            </Text>
          </View>
        </ScrollView>

        <View className="px-5 pb-12">
          <Button
            label={saving ? t("등록하는 중...") : t("등록하기")}
            disabled={!canSubmit}
            loading={saving}
            onPress={handleSubmitPress}
          />
        </View>
      </KeyboardAvoidingContainer>
    </View>
  );
}
