import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { uploadImage } from "../../shared/api/upload";
import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageSlot } from "../../shared/components/base/ImageSlot";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { useDiscardGuard, useFormDirty } from "../../shared/hooks/useDiscardGuard";
import { useSubmitLock } from "../../shared/hooks/useSubmitLock";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCreateNotice, useNotice, useUpdateNotice } from "./api";
import { KeyboardAvoidingContainer } from "../../shared/components/base/KeyboardAvoidingContainer";

// 공지 등록·수정 (관리자 전용, 자체 디자인 — 시안 없음). 수정 모드는 route의 id로 기존 공지를 채운다. 내용이나 사진 중 하나는 있어야 한다
// (포스터 한 장짜리 공지도 되고, 글만 있는 공지도 된다 — 서버도 같은 규칙).
export function NoticeWriteScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, "NoticeWrite">>();
  const editingId = params?.id;
  const createNotice = useCreateNotice();
  const updateNotice = useUpdateNotice(editingId ?? "");
  const { data: editingNotice } = useNotice(editingId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // saving은 다시 그려져야 바뀐다 — 그 전의 연타는 즉시 잠기는 이 잠금으로 막는다.
  const { locked, acquire, release } = useSubmitLock();

  // 수정 모드 프리필 — 한 번만 채운다 (입력 중 캐시가 갱신돼도 덮지 않는다).
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !editingNotice) return;
    setTitle(editingNotice.title);
    setContent(editingNotice.content ?? "");
    setPhotoUri(editingNotice.imageUrl);
    setPrefilled(true);
  }, [editingNotice, prefilled]);

  // 쓰던 내용이 있는 채로 뒤로가기를 누르면 확인을 받는다. 등록에 성공해 화면이 닫힐 때는 막지 않는다(locked).
  const dirty = useFormDirty({ title, content, photoUri }, !editingId || prefilled);
  const discardDialog = useDiscardGuard({ dirty, submitting: locked, mode: editingId ? "edit" : "write" });

  const canSubmit =
    !saving && title.trim() !== "" && (content.trim() !== "" || photoUri !== null);

  const handlePhotoUploadPress = async () => {
    // 시스템 포토 피커라 별도 권한 요청이 필요 없다 (셀 커버 업로드와 동일).
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    setPhotoUri(result.assets[0].uri);
  };

  const handleSubmitPress = async () => {
    if (!canSubmit || !acquire()) return;
    setSaving(true);
    try {
      // 기존 사진(http 주소)을 그대로 두면 다시 올리지 않는다 — 새로 고른 로컬 파일만 업로드.
      const imageUrl = photoUri
        ? photoUri.startsWith("http")
          ? photoUri
          : await uploadImage(photoUri)
        : undefined;
      if (editingId) {
        await updateNotice.mutateAsync({
          title: title.trim(),
          content: content.trim() !== "" ? content.trim() : null,
          imageUrl: imageUrl ?? null,
        });
      } else {
        await createNotice.mutateAsync({
          title: title.trim(),
          ...(content.trim() !== "" && { content: content.trim() }),
          ...(imageUrl && { imageUrl }),
        });
      }
      navigation.goBack();
    } catch {
      release();
      Alert.alert(editingId ? t("수정 실패") : t("등록 실패"), t("잠시 후 다시 시도해주세요."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingContainer>
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-10 pt-6"
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

        <View className="px-5 pb-12 pt-3">
          <Button
            label={
              editingId
                ? saving
                  ? t("수정하는 중...")
                  : t("수정하기")
                : saving
                  ? t("등록하는 중...")
                  : t("등록하기")
            }
            disabled={!canSubmit}
            loading={saving}
            onPress={handleSubmitPress}
          />
        </View>
      </KeyboardAvoidingContainer>
      {discardDialog}
    </View>
  );
}
