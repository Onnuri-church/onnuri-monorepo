import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxMultiple } from "../../shared/components/base/ImageUploadBoxMultiple";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { DateField, toDateString } from "../../shared/components/composed/DateField";
import { uploadImage } from "../../shared/api/upload";
import type { RootStackParamList } from "../../shared/types/navigation";
import { useCellNewsDetail, useCreateCellNews, useUpdateCellNews } from "./api";

const MAX_PHOTOS = 5;

// 셀 소식 글쓰기·수정 겸용 (시안 게시판 글쓰기: 날짜 → 사진(최대 5장) → 제목 → 내용 → 등록).
// newsId가 있으면 수정 모드 — 상세를 거쳐 들어오므로 캐시가 있어 첫 렌더에 프리필된다.
export function CellNewsWriteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CellNewsWrite">>();
  const { cellId, newsId } = route.params;

  const { data: editing } = useCellNewsDetail(newsId ?? "");
  const isEditing = newsId !== undefined;

  const [selectDate, setSelectDate] = useState<string | null>(
    isEditing ? (editing?.eventDate ?? null) : toDateString(new Date()),
  );
  // 기존 사진(http)과 새로 고른 사진(file://)이 섞여 있어도 uploadImage가 http는 통과시킨다.
  const [photoUris, setPhotoUris] = useState<string[]>(editing?.imageUrls ?? []);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [uploading, setUploading] = useState(false);

  const createNews = useCreateCellNews(cellId);
  const updateNews = useUpdateCellNews(cellId, newsId ?? "");
  const saving = createNews.isPending || updateNews.isPending;

  const handleSubmitPress = async () => {
    if (!selectDate || saving || uploading) return;

    // 사진 먼저 전부 업로드해 주소로 바꾼 뒤 글을 만든다 — 하나라도 실패하면 등록하지 않는다.
    let imageUrls: string[];
    setUploading(true);
    try {
      imageUrls = await Promise.all(photoUris.map((uri) => uploadImage(uri)));
    } catch {
      Alert.alert("사진 업로드 실패", "잠시 후 다시 시도해주세요.");
      return;
    } finally {
      setUploading(false);
    }

    const payload = { title: title.trim(), content: content.trim(), eventDate: selectDate, imageUrls };
    const mutation = isEditing ? updateNews : createNews;
    mutation.mutate(payload, {
      onSuccess: () => navigation.goBack(),
      onError: () => Alert.alert(isEditing ? "저장 실패" : "등록 실패", "잠시 후 다시 시도해주세요."),
    });
  };

  return (
    <View className="flex-1 bg-background-normal">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          className="h-full flex-1"
          contentContainerClassName="justify-start gap-8 px-5 pb-20 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          <DateField
            label="날짜"
            placeholder="날짜를 선택하세요."
            value={selectDate}
            onChange={setSelectDate}
          />

          <View>
            <Field label={`사진(최대 ${MAX_PHOTOS}장)`}>
              <ImageUploadBoxMultiple
                imageUris={photoUris}
                onChange={setPhotoUris}
                maxCount={MAX_PHOTOS}
              />
            </Field>
          </View>

          <View>
            <TextField
              label="제목"
              placeholder="제목을 입력해주세요."
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View>
            <TextAreaField
              label="내용"
              placeholder="셀원들에게 전할 소식을 적어보세요!"
              value={content}
              onChangeText={setContent}
            />
          </View>

          <View className="mt-16">
            <Button
              label={isEditing ? "저장하기" : "등록하기"}
              onPress={handleSubmitPress}
              disabled={
                title.trim().length === 0 || content.trim().length === 0 || saving || uploading
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
