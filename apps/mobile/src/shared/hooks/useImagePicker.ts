import { useRef } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { type AppSheetRef } from "../components/base/AppSheet";

export function useImagePicker(applyPickerResult: (result: ImagePicker.ImagePickerResult) => void) {
  const sheetRef = useRef<AppSheetRef>(null);
  const handleUploadPress = () => {
    sheetRef.current?.open();
  };

  const handleTakePhoto = async () => {
    sheetRef.current?.close();
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert("카메라 권한이 필요해요", "설정에서 카메라 접근을 허용해주세요.");
      return;
    }
    applyPickerResult(await ImagePicker.launchCameraAsync({ quality: 0.8 }));
  };

  return {
    sheetRef,
    handleUploadPress,
    handleTakePhoto,
  };
}
