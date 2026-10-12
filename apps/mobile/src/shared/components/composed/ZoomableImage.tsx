import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
// 사진은 화면 가장자리에 붙지 않게 영역의 이 비율만큼만 쓴다 (가로 92%, 세로 84%).
const FIT_WIDTH_RATIO = 0.92;
const FIT_HEIGHT_RATIO = 0.84;

interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  /** 지금 확대돼 있는지 — 확대 전에는 한 손가락 슬라이드를 바깥 목록(사진 넘기기)에 양보한다. */
  zoomed: boolean;
  /** 확대 상태가 바뀔 때 부른다 — 확대 중에는 바깥 가로 스크롤(사진 넘기기)을 멈추려고 쓴다. */
  onZoomChange?: (zoomed: boolean) => void;
}

// 두 손가락으로 확대·축소하고, 확대한 상태에서는 한 손가락으로 옮겨 보고, 두 번 탭하면 확대/원래대로.
// 사진은 박스 안에 비율을 지켜 꽉 차게(contain) 가운데에 놓는다.
export function ZoomableImage({ uri, width, height, zoomed, onZoomChange }: ZoomableImageProps) {
  const imageWidth = width * FIT_WIDTH_RATIO;
  const imageHeight = height * FIT_HEIGHT_RATIO;
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const notifyZoom = (zoomed: boolean) => onZoomChange?.(zoomed);

  // 확대한 만큼만 옮길 수 있게 가장자리를 제한한다.
  const clampOffsets = () => {
    "worklet";
    const maxX = (imageWidth * (scale.value - 1)) / 2;
    const maxY = (imageHeight * (scale.value - 1)) / 2;
    translateX.value = Math.min(Math.max(translateX.value, -maxX), maxX);
    translateY.value = Math.min(Math.max(translateY.value, -maxY), maxY);
  };

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    runOnJS(notifyZoom)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, MIN_SCALE), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      clampOffsets();
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      runOnJS(notifyZoom)(true);
    });

  // 확대하기 전의 한 손가락 슬라이드는 이 제스처가 가로채지 않는다 — 안 그러면 옆 사진으로 안 넘어간다.
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
      clampOffsets();
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
      runOnJS(notifyZoom)(true);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View
        style={{ width, height, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      >
        <Animated.Image
          source={{ uri }}
          style={[{ width: imageWidth, height: imageHeight }, animatedStyle]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}
