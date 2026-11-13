import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from "expo-apple-authentication";

// Apple 로그인 버튼 (SCRUM-200, iOS). 애플 가이드라인에 맞는 시스템 버튼을 그대로 쓴다 —
// 높이·모서리는 카카오·구글 버튼(h-12, rounded-5)과 맞춘다.
export function AppleLoginButton({ onPress }: { onPress: () => void }) {
  return (
    <AppleAuthenticationButton
      buttonType={AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={20}
      style={{ height: 48, width: "100%" }}
      onPress={onPress}
    />
  );
}
