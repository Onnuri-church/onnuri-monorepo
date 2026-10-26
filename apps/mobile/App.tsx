import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";
import { queryClient } from "./src/shared/api/queryClient";
import { pretendardFonts } from "./src/shared/theme/fonts";
import "./src/shared/i18n";
import { restoreLanguage } from "./src/shared/store/useLanguageStore";
import { ThemeRoot } from "./src/shared/theme/ThemeRoot";
import { restoreThemeMode } from "./src/shared/store/useThemeStore";
import { RootNavigator } from "./src/navigation/RootNavigator";

// 오류 수집 — 앱이 갑자기 꺼지거나 화면에서 예외가 나면 Sentry로 보낸다.
// EXPO_PUBLIC_SENTRY_DSN이 비어 있으면 꺼진다 (로컬 개발 기본값 — DSN 없이도 앱은 정상 동작).
// 서버(apps/api)와 같은 방침: 개인정보 전송 끔, 오류 모니터링만 켜고 성능 추적(tracing)은 끈다.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN) && !__DEV__,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? "development",
});

SplashScreen.preventAutoHideAsync();

function App() {
  const [fontsLoaded] = useFonts(pretendardFonts);

  useEffect(() => {
    void restoreThemeMode();
    void restoreLanguage();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeRoot>
            <BottomSheetModalProvider>
              <RootNavigator />
            </BottomSheetModalProvider>
          </ThemeRoot>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap은 앱 최상단을 감싸 렌더링 중 난 예외도 잡아서 보낸다.
export default Sentry.wrap(App);
