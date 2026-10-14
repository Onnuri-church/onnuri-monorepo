import * as Brightness from "expo-brightness";
import { useEffect, useRef, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";

// 기기 밝기 조절 슬라이더 (시안: 트랙 4px + 노브 20px 원형).
// expo-brightness는 iOS에서 권한 없이 동작하고, Android는 앱 화면 밝기만 바꾼다
// (시스템 밝기는 별도 권한 필요 — 설정 화면 용도로는 앱 밝기로 충분).
// 드래그 라이브러리 없이 터치 위치(locationX)를 트랙 폭으로 나눠 값을 얻는다.
export function BrightnessSlider() {
  const [value, setValue] = useState(0.5);
  const trackWidth = useRef(0);

  useEffect(() => {
    Brightness.getBrightnessAsync().then(setValue);
  }, []);

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    trackWidth.current = event.nativeEvent.layout.width;
  };

  const handleTouch = (locationX: number) => {
    if (trackWidth.current === 0) return;
    const next = Math.min(1, Math.max(0, locationX / trackWidth.current));
    setValue(next);
    Brightness.setBrightnessAsync(next);
  };

  return (
    <View
      className="h-6 flex-1 justify-center"
      onLayout={handleTrackLayout}
      // 탭·드래그 모두 같은 계산이라 responder 콜백 두 개로 처리한다.
      // 노브에만 반응하면 터치 영역이 너무 작아서 트랙 전체가 받는다.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => handleTouch(event.nativeEvent.locationX)}
      onResponderMove={(event) => handleTouch(event.nativeEvent.locationX)}
    >
      <View className="h-1 overflow-hidden rounded bg-background-assistive">
        <View className="h-full bg-primary-normal" style={{ width: `${value * 100}%` }} />
      </View>
      <View
        pointerEvents="none"
        className="absolute h-5 w-5 rounded-full bg-primary-normal"
        style={{ left: `${value * 100}%`, marginLeft: -10 }}
      />
    </View>
  );
}
