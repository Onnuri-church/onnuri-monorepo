import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxMultiple } from "../../shared/components/base/ImageUploadBoxMultiple";
import { TextAreaField } from "../../shared/components/base/TextAreaField";
import { TextField } from "../../shared/components/base/TextField";
import { Toggle } from "../../shared/components/base/Toggle";
import { SelectField } from "../../shared/components/composed/SelectField";
import { PRAYER_CATEGORIES } from "./api";

// 카테고리 선택지는 목록 필터와 같은 소스를 쓰되 "전체"만 뺀다 — 글에 "전체"를 달 수는 없다.
const WRITE_CATEGORIES = PRAYER_CATEGORIES.filter((category) => category.value !== "all").map(
  (category) => category.label,
);

// 시안 확정값 (Action Sheet-공개기간 설정). "직접설정"의 후속 동작(기간 입력 UI)은 시안 확인 전 —
// 지금은 선택값으로만 남는다.
const PERIOD_OPTIONS = ["1주일", "2주일", "1개월", "직접설정"];

// 기도제목 작성하기 (시안 402pt 프레임: 익명 토글 → 기도제목 → 카테고리 → 공개기간 → 사진 → 내용 → 등록).
export function PrayerWriteScreen() {
  const [anonymous, setAnonymous] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [period, setPeriod] = useState<string | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
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
          <View className="flex-row items-center justify-between">
            {/* 라벨 타이포는 Field 라벨과 동일하게 맞춘다 (시안: 같은 위계). */}
            <Text className="text-body-main text-text-normal">익명으로 작성</Text>
            <Toggle value={anonymous} onValueChange={setAnonymous} />
          </View>

          <View>
            <TextField
              label="기도제목"
              placeholder="한 줄로 표현해보세요."
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <SelectField
            label="기도 카테고리"
            placeholder="카테고리를 선택하세요."
            options={WRITE_CATEGORIES}
            value={category}
            onChange={setCategory}
          />

          <View>
            <SelectField
              label="공개기간"
              placeholder="공개기간을 지정하세요."
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
            {/* SelectField 내부의 아래 py-4를 -mt-2로 상쇄해 안내문을 입력줄 가까이 붙인다. */}
            <Text className="-mt-2 text-caption-main text-text-alternative">
              선택한 기간이 지나면 기도제목이 자동으로 목록에서 사라져요
            </Text>
          </View>

          <View>
            <Field label="사진(선택)">
              <ImageUploadBoxMultiple imageUris={photoUris} onChange={setPhotoUris} />
            </Field>
          </View>

          <View>
            <TextAreaField
              label="내용"
              placeholder="나누고 싶은 기도제목을 자유롭게 적어주세요."
              value={content}
              onChangeText={setContent}
            />
          </View>

          <View className="mt-16">
            <Button
              label="등록하기"
              onPress={handleSubmitPress}
              disabled={
                title.trim().length === 0 ||
                category === null ||
                period === null ||
                content.trim().length === 0
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
