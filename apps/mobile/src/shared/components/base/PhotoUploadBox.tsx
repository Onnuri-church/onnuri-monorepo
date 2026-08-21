import { Image, Pressable, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Icon } from "./Icon";
import { colors } from "../../theme/tokens";

interface PhotoUploadBoxProps {
  label: string;
  /** 선택된 사진 URI. 있으면 빈 슬롯 UI 대신 사진을 채워 보여준다. */
  imageUri?: string | null;
  /** 박스 터치로 사진을 고르면 그 URI, 우상단 X로 해제하면 null. */
  onChange?: (uri: string | null) => void;
}

// 사진 업로드 슬롯. 폭은 호출부가 정하고(flex-1로 나눠 쓰는 전제) 높이는 aspect-square로 따라온다.
// 사진 선택도 여기서 처리한다 — 시스템 포토 피커(iOS PHPicker / Android Photo Picker)라 별도 권한 요청이 필요 없다.
export function PhotoUploadBox({ label, imageUri, onChange }: PhotoUploadBoxProps) {
  const handlePickPress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) {
      onChange?.(result.assets[0].uri);
    }
  };

  return (
    <Pressable
      onPress={handlePickPress}
      className="flex-1 aspect-square items-center justify-center rounded-2xl border border-dashed border-icon-normal bg-background-muted"
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} className="absolute inset-0 rounded-2xl" resizeMode="cover" />
      ) : (
        <>
          <Icon name="add-round-light" size={36} color={colors.icon.normal} />
          <Text className="text-body-regular text-text-alternative">{label}</Text>
        </>
      )}
      {/* 안쪽 Pressable은 onPress가 실제로 달려 있어야 터치를 가져간다 —
          핸들러가 없으면 박스(사진 선택)로 넘어가므로 빈 함수라도 채운다. */}
      <Pressable
        onPress={() => onChange?.(null)}
        className="absolute right-0 top-0 p-2"
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
      >
        <Icon name="close-square" size={30} color={colors.text.normal} />
      </Pressable>
    </Pressable>
  );
}
