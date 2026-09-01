import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Button } from "../../shared/components/base/Button";
import { Field } from "../../shared/components/base/Field";
import { ImageUploadBoxMultiple } from "../../shared/components/base/ImageUploadBoxMultiple";
import { DateField, toDateString } from "../../shared/components/composed/DateField";
import type { RootStackParamList } from "../../shared/types/navigation";

// 주보는 앞/뒤 2장 고정, 나눔지는 최대 5장 (작업자 확정).
const BULLETIN_PHOTO_COUNT = 2;
const MAX_SHARING_SHEET_PHOTOS = 5;

// 주보/나눔지 업로드 (시안: 날짜 → 주보 → 나눔지 → 등록하기).
// 사진 섹션 둘은 같은 컴포넌트지만 올리는 대상이 달라 상태를 따로 갖는다.
export function BulletinWriteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 날짜는 오늘로 시작한다 — 비워둘 수 없어서 등록 조건에는 사진만 본다.
  const [selectDate, setSelectDate] = useState(toDateString(new Date()));
  const [bulletinUris, setBulletinUris] = useState<string[]>([]);
  const [sharingSheetUris, setSharingSheetUris] = useState<string[]>([]);

  const handleSubmitPress = () => {
    // TODO(API): 등록 연동 전 — 목록으로 돌아가기만 한다.
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-background-normal">
      <ScrollView
        className="h-full flex-1"
        contentContainerClassName="justify-start gap-8 px-5 pb-20 pt-4"
      >
        <DateField
          label="날짜"
          placeholder="날짜를 선택하세요."
          value={selectDate}
          onChange={setSelectDate}
        />

        <Field label="주보">
          <ImageUploadBoxMultiple
            imageUris={bulletinUris}
            onChange={setBulletinUris}
            maxCount={BULLETIN_PHOTO_COUNT}
          />
        </Field>

        <Field label={`나눔지(최대 ${MAX_SHARING_SHEET_PHOTOS}장)`}>
          <ImageUploadBoxMultiple
            imageUris={sharingSheetUris}
            onChange={setSharingSheetUris}
            maxCount={MAX_SHARING_SHEET_PHOTOS}
          />
        </Field>

        <View className="mt-8">
          <Button
            label="등록하기"
            onPress={handleSubmitPress}
            disabled={bulletinUris.length === 0 || sharingSheetUris.length === 0}
          />
        </View>
      </ScrollView>
    </View>
  );
}
