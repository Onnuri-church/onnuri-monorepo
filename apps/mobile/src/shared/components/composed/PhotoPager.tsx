import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { ZoomableImage } from "./ZoomableImage";

interface PhotoPagerProps {
  urls: string[];
  /** 처음 보여줄 장. 사진이 나중에 도착해도 처음 도착한 시점에 한 번만 이 장으로 맞춘다. */
  initialIndex?: number;
  /** 지금 보이는 장이 바뀔 때마다 부른다. */
  onIndexChange?: (index: number) => void;
}

// 사진 뷰어의 본체. 좌우로 밀어서 넘기고(슬라이드), 두 손가락으로 확대·축소, 두 번 탭해 확대한다.
// 사진은 이 컴포넌트가 차지한 영역의 가운데에 비율을 지켜 꽉 차게 놓는다 — 화살표 버튼은 두지 않는다.
// 사진을 한 장씩 넘겨 보는 화면은 버튼식이 아니라 이 컴포넌트를 쓴다 (2026-10-10 결정).
export function PhotoPager({ urls, initialIndex = 0, onIndexChange }: PhotoPagerProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(initialIndex);
  // 사진을 확대한 동안에는 옆으로 넘어가지 않게 가로 스크롤을 멈춘다 (한 손가락 이동이 확대 사진을 움직여야 한다).
  const [zoomed, setZoomed] = useState(false);
  // 사진이 놓일 영역의 실제 크기 — 화면 가운데에 오게 이 영역을 꽉 채운다.
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const appliedInitial = useRef(false);
  const total = urls.length;

  // 처음 장으로 맞출 때 index를 즉시 갱신한다 — Android는 프로그램 스크롤이 momentum end를
  // 안 쏘기도 해서 이벤트만 믿으면 카운터가 어긋난다. 제스처 스크롤은 handleScrollEnd가 덮는다.
  const goTo = (next: number, animated = true) => {
    listRef.current?.scrollToIndex({ index: next, animated });
    setIndex(next);
  };

  // 캐시가 비어 있던 채 열리면 FlatList가 빈 배열로 마운트돼 initialScrollIndex가 무효다 —
  // 사진이 처음 도착한 시점에 한 번만 원하는 장으로 맞춘다.
  useEffect(() => {
    if (appliedInitial.current || total === 0) return;
    appliedInitial.current = true;
    if (initialIndex > 0) {
      const next = Math.min(initialIndex, total - 1);
      requestAnimationFrame(() => goTo(next, false));
    }
    // goTo는 렌더마다 새로 만들어지지만 동작이 같아 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, initialIndex]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    setZoomed(false);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: boxWidth, height: boxHeight } = event.nativeEvent.layout;
    setBox({ width: boxWidth, height: boxHeight });
  };

  return (
    <View className="flex-1" onLayout={handleLayout}>
      {box && (
      <FlatList
        ref={listRef}
        data={urls}
        keyExtractor={(url, itemIndex) => `${itemIndex}-${url}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!zoomed}
        initialScrollIndex={Math.min(initialIndex, Math.max(total - 1, 0))}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width, height: box.height }}>
            <ZoomableImage
              uri={item}
              width={width}
              height={box.height}
              zoomed={zoomed}
              onZoomChange={setZoomed}
            />
          </View>
        )}
      />
      )}
    </View>
  );
}
