// Apple 로그인 버튼 (SCRUM-200) — 안드로이드·웹에서는 그리지 않는다.
// iOS 구현은 AppleLoginButton.ios.tsx (Metro가 플랫폼별 파일을 고른다). 애플 네이티브 모듈은
// iOS에만 있어서, 안드로이드 번들에 들어가면 불러오는 순간 에러가 나므로 파일을 나눴다.
export function AppleLoginButton(_props: { onPress: () => void }) {
  return null;
}
