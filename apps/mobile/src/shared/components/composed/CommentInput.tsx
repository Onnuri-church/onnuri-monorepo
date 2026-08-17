import { Image, Pressable, TextInput, View } from "react-native";

import { Icon } from "../base/Icon";
import { colors } from "../../theme/tokens";

interface CommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  /** 로그인한 사용자 프로필. 없으면 회색 원으로 자리만 잡는다. */
  avatarUrl?: string | null;
  placeholder?: string;
}

// 시안 확정값(402pt 프레임): 아바타 36, 전송 36, 간격 8, 입력창 높이 36.
// 36(아바타 h-9) + 8(gap-2) + 입력창 + 8 + 36(전송 h-9) → 입력창만 flex로 남는 폭을 먹는다.
// 댓글 입력 줄. 게시판 종류를 모르고 값과 콜백만 받으므로 여러 게시판이 공용으로 쓴다.
// 전송 버튼은 값이 비어 있으면 눌리지 않는다.
export function CommentInput({
  value,
  onChangeText,
  onSubmit,
  avatarUrl,
  placeholder = "댓글을 입력하세요",
}: CommentInputProps) {
  const canSubmit = value.trim().length > 0;

  return (
    <View className="flex-row items-center gap-2">
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
