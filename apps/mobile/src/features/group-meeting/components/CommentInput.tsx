import { Image, Pressable, TextInput, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

interface CommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  /** 로그인한 사용자 프로필. 없으면 회색 원으로 자리만 잡는다. */
  avatarUrl?: string | null;
  placeholder?: string;
}

// 시안 확정값(402pt 프레임): 줄 전체 362, 입력창 262x36.
// 36(아바타 h-9) + 14(gap-3.5) + 입력창 + 14 + 36(전송 h-9) = 362 → 입력창만 flex로 남는 폭을 먹는다.
// 댓글 입력 줄. 전송 버튼은 값이 비어 있으면 눌리지 않는다.
export function CommentInput({
  value,
  onChangeText,
  onSubmit,
  avatarUrl,
  placeholder = "댓글을 입력하세요",
}: CommentInputProps) {
  const canSubmit = value.trim().length > 0;

  return (
    <View className="flex-row items-center gap-3.5">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} className="h-9 w-9 rounded-full" />
      ) : (
        <View className="h-9 w-9 rounded-full bg-text-assistive" />
      )}
      <TextInput
        className="h-9 flex-1 rounded-full bg-background-muted px-4 text-body-small text-text-normal"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.alternative}
        onSubmitEditing={canSubmit ? onSubmit : undefined}
        returnKeyType="send"
      />
      {/* 눌림은 active: 변형 — className과 함수형 style을 같이 주면 함수 style이 무시된다. */}
      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        className="h-9 w-9 items-center justify-center rounded-full bg-background-alternative active:opacity-60"
      >
        <Icon
          name="send-fill"
          size={20}
          color={canSubmit ? colors.primary.normal : colors.icon.normal}
        />
      </Pressable>
    </View>
  );
}
