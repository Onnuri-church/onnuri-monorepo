import { useTranslation } from "react-i18next";
import { Alert, Pressable, TextInput, View } from "react-native";

import { Avatar } from "../base/Avatar";
import { Icon } from "../base/Icon";
import { useAuthStore } from "../../store/useAuthStore";
import { useThemeColors } from "../../theme/useThemeColors";

interface CommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  /** 로그인한 사용자 프로필 사진. 없으면(게스트 포함) 기본 프로필 이미지(OY 심볼)가 나온다. */
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
  placeholder,
}: CommentInputProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const canSubmit = value.trim().length > 0;
  // 사진을 안 넘긴 화면도 로그인한 내 사진이 나오게 세션 값을 기본으로 쓴다.
  const myAvatarUrl = useAuthStore((state) =>
    state.session.status === "authenticated" ? state.session.user.avatarUrl : null,
  );
  // 게스트는 댓글을 못 쓴다 — 입력창을 누르면 키보드 대신 로그인 안내를 띄운다.
  const isGuest = useAuthStore((state) => state.session.status !== "authenticated");
  const handleGuestPress = () =>
    Alert.alert(t("로그인이 필요해요"), t("댓글은 로그인 후 작성할 수 있어요."));

  return (
    <View className="flex-row items-center gap-2">
      <Avatar imageUrl={avatarUrl === undefined ? myAvatarUrl : avatarUrl} size={36} />
      {isGuest ? (
        <Pressable className="flex-1" onPress={handleGuestPress}>
          <TextInput
            className="h-9 rounded-full bg-background-muted px-4 text-body-small text-text-normal"
            editable={false}
            pointerEvents="none"
            placeholder={placeholder ?? t("댓글을 입력하세요")}
            placeholderTextColor={themeColors.text.alternative}
          />
        </Pressable>
      ) : (
        <TextInput
          className="h-9 flex-1 rounded-full bg-background-muted px-4 text-body-small text-text-normal"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? t("댓글을 입력하세요")}
          placeholderTextColor={themeColors.text.alternative}
          onSubmitEditing={canSubmit ? onSubmit : undefined}
          returnKeyType="send"
        />
      )}
      {/* 눌림은 active: 변형 — className과 함수형 style을 같이 주면 함수 style이 무시된다. */}
      <Pressable
        onPress={isGuest ? handleGuestPress : onSubmit}
        disabled={!isGuest && !canSubmit}
        className="h-9 w-9 items-center justify-center rounded-full bg-background-alternative active:opacity-60"
      >
        <Icon
          name="send-fill"
          size={20}
          color={canSubmit ? themeColors.primary.normal : themeColors.icon.normal}
        />
      </Pressable>
    </View>
  );
}
