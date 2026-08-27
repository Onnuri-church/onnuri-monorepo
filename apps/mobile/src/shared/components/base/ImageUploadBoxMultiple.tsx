import { useState } from "react";
import { Text, View, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ImageSlot } from "./ImageSlot";
import { useImagePicker } from "../../hooks/useImagePicker";
import { ImagePickerSheet } from "./ImagePickerSheet";

interface ImageUploadBoxMultipleProps {
  imageUris: string[];
  onChange?: (uris: string[]) => void;
  maxCount?: number;
}

const DEFAULT_MAX_COUNT = 5;
// ScrollView의 contentContainerClassName="gap-4"와 같은 값(16px). 슬롯 크기를
// "슬롯 2개 + 간격 1개 = 컨테이너 폭"으로 역산할 때 같이 써야 해서 숫자로도 갖고 있는다.
const GAP = 16;
// onLayout으로 실측 폭을 받기 전 첫 프레임에 쓰는 값 — 기존 h-43(172px)과 동일.
const INITIAL_SLOT_SIZE = 172;

// 채워진 사진 슬롯들 + 맨 끝에 추가 슬롯 하나. 슬롯 폭은 고정값이라 화면에 다 안 들어가면
// 가로 스크롤(스와이프)로 넘어간다 — 추가 버튼이 항상 맨 오른쪽에 있는 이유.
export function ImageUploadBoxMultiple({
  imageUris,
  onChange,
  maxCount = DEFAULT_MAX_COUNT,
}: ImageUploadBoxMultipleProps) {
  const handleDeletePress = (index: number) => {
    onChange?.(imageUris.filter((_, i) => i !== index));
  };

  const applyPickerResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      onChange?.([...imageUris, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const { sheetRef, handleUploadPress, handleTakePhoto } = useImagePicker(applyPickerResult);

  const [containerWidth, setContainerWidth] = useState(0);
  const slotSize = containerWidth > 0 ? (containerWidth - GAP) / 2 : INITIAL_SLOT_SIZE;

  const handlePickFromAlbum = async () => {
    sheetRef.current?.close();
    applyPickerResult(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxCount - imageUris.length,
      }),
    );
  };

  return (
    <View className="relative" onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      {imageUris.length > 1 && imageUris.length !== maxCount && (
        <View className="absolute -top-12 right-0 flex items-center justify-center h-8 w-auto px-3 rounded-xl bg-background-dark">
          <Text className="text-caption-main text-text-disable">사진 추가 버튼은 제일 오른쪽에 있어요!</Text>
          <View className="absolute -bottom-1.5 w-4 h-4 rounded-b-sm bg-background-dark rotate-45" />
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
        {imageUris.map((uri, index) => (
          <View key={index} style={{ width: slotSize, height: slotSize }}>
            <ImageSlot imageUri={uri} onDeletePress={() => handleDeletePress(index)} />
          </View>
        ))}

        {/* 최소 2슬롯을 유지한다 — 처음엔 추가 슬롯 2개, 사진이 채워지면 1개로 줄어든다. */}
        {Array.from({
          length: imageUris.length >= maxCount ? 0 : Math.max(1, 2 - imageUris.length),
        }).map((_, index) => (
          <View key={`add-${index}`} style={{ width: slotSize, height: slotSize }}>
            <ImageSlot imageUri={null} onUploadPress={handleUploadPress} />
          </View>
        ))}
      </ScrollView>

      <View className="mt-4">
        <Text className="text-body-small text-text-alternative">{`${imageUris.length}/${maxCount}장`}</Text>
      </View>

      <ImagePickerSheet
        sheetRef={sheetRef}
        pickerItems={
          [
            ["카메라로 촬영", handleTakePhoto],
            ["앨범에서 선택", handlePickFromAlbum],
          ] as const
        }
      />
    </View>
  );
}
