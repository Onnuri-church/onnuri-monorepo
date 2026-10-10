import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

interface PhotoPagerProps {
  urls: string[];
  /** 처음 보여줄 장. 사진이 나중에 도착해도 처음 도착한 시점에 한 번만 이 장으로 맞춘다. */
  initialIndex?: number;
  /** 지금 보이는 장이 바뀔 때마다 부른다. */
  onIndexChange?: (index: number) => void;
}

// 시안 402x617 — 화면 폭에 맞춘 콘텐츠 비율 영역이다 (DESIGN.md 사이즈 규칙 예외).
const IMAGE_ASPECT_RATIO = 402 / 617;

// 사진 뷰어의 본체. 좌우로 밀어서 넘긴다(슬라이드) — 화살표 버튼은 두지 않는다.
// 사진을 한 장씩 넘겨 보는 화면은 버튼식이 아니라 이 컴포넌트를 쓴다 (2026-10-10 결정).
export function PhotoPager({ urls, initialIndex = 0, onIndexChange }: PhotoPagerProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(initialIndex);
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
  };

  return (
    <View className="flex-1 justify-center">
      <FlatList
        ref={listRef}
        data={urls}
        keyExtractor={(url, itemIndex) => `${itemIndex}-${url}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.min(initialIndex, Math.max(total - 1, 0))}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <View className="justify-center" style={{ width }}>
            <Image
              source={{ uri: item }}
              style={{ width: "100%", aspectRatio: IMAGE_ASPECT_RATIO }}
              resizeMode="contain"
            />
          </View>
        )}
      />
    </View>
  );
}
