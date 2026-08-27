import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ImageSlot } from "./ImageSlot";
import { useImagePicker } from "../../hooks/useImagePicker";
import { ImagePickerSheet } from "./ImagePickerSheet";

interface ImageUploadBoxSingleProps {
  imageUri: string | null;
  onChange?: (uri: string | null) => void;
}

// "기존 이미지 불러오기"로 고를 수 있는 앱 내장 이미지.
const presetContext = require.context("../../assets/preset-images", false, /\.(png|jpe?g|webp)$/);
const PRESET_IMAGES = presetContext.keys().sort().map((key) => presetContext(key) as number);

export function ImageUploadBoxSingle({ imageUri, onChange }: ImageUploadBoxSingleProps) {

  const handleDeletePress = () => {
    onChange?.(null);
  };

  const applyPickerResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      onChange?.(result.assets[0].uri);
    }
  };

  const { sheetRef, handleUploadPress, handleTakePhoto } = useImagePicker(applyPickerResult);

  const handlePickFromAlbum = async () => {
    sheetRef.current?.close();
    applyPickerResult(
      await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 }),
    );
  };

  const handleUseRandomPreset = () => {
    sheetRef.current?.close();
    const preset = PRESET_IMAGES[Math.floor(Math.random() * PRESET_IMAGES.length)];
    onChange?.(Image.resolveAssetSource(preset).uri);
  };

  return (
    <View className="h-43">
      <ImageSlot
        imageUri={imageUri}
        outline
        onUploadPress={handleUploadPress}
        onDeletePress={handleDeletePress}
      />

      <ImagePickerSheet
        sheetRef={sheetRef}
        pickerItems={
          [
            ["카메라로 촬영", handleTakePhoto],
            ["앨범에서 선택", handlePickFromAlbum],
            ["기존 이미지 불러오기", handleUseRandomPreset],
          ] as const
        }
      />
    </View>
  );
}
