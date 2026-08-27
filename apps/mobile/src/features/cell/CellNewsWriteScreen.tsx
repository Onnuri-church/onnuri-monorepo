import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxMultiple } from "../../shared/components/base/ImageUploadBoxMultiple";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { DateField, toDateString } from "../../shared/components/composed/DateField";

const MAX_PHOTOS = 5;

// 셀 소식 글쓰기 (시안 게시판 글쓰기: 날짜 → 사진(최대 5장, 가로 스크롤) → 제목 → 내용 → 등록).
export function CellNewsWriteScreen() {
  const [selectDate, setSelectDate] = useState<string | null>(toDateString(new Date()));
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmitPress = () => {
    // TODO(API): 등록 연동 전 — 입력 검증까지만 동작한다.
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
              label="등록하기"
              onPress={handleSubmitPress}
              disabled={title.trim().length === 0 || content.trim().length === 0}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
