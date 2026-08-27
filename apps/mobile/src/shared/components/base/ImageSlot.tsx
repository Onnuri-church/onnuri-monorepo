import { Image, Pressable } from "react-native";

import { Icon } from "./Icon";
import { colors } from "../../theme/tokens";

interface ImageSlotProps {
  imageUri: string | null;
  outline?: boolean;
  onUploadPress?: () => void;
  onDeletePress?: () => void;
}

export function ImageSlot({ imageUri, outline = false, onUploadPress, onDeletePress }: ImageSlotProps) {
  return (
    <Pressable
      className={`relative flex-1 items-center justify-center rounded-2xl bg-background-muted ${outline && "border border-dashed border-icon-normal"}`}
      onPress={onUploadPress}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} className="absolute inset-0 rounded-2xl" resizeMode="cover" />
      ) : (
        <Icon name="add-round-light" size={36} color={colors.icon.normal} />
      )}

      {imageUri && (
        <Pressable
          className="absolute top-4 right-4 flex justify-center items-center w-5 h-5 rounded-full bg-semantic-danger"
          onPress={onDeletePress}
        >
          <Icon name="close-square" size={28} color={colors.icon.disable} />
        </Pressable>
      )}
    </Pressable>
  );
}
