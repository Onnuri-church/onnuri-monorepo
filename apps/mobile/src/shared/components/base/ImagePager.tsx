import { useState } from "react";
import { Image, Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { ChatImageViewer } from "../../../features/chat/components/ChatImageViewer";
import { PageIndicator } from "./PageIndicator";

interface ImagePagerProps {
  /** 넘겨 볼 이미지들. 순서대로 한 장씩 보여준다. */
  images: { id: string; url: string }[];
  className?: string;
}

// 이미지를 한 장씩 가로로 넘겨 보는 뷰어. 위에 현재 위치를 점으로 찍는다.
// 도메인을 모르고 이미지 목록만 받는다 — 주보와 나눔지가 같은 걸 쓴다.
// 이미지가 화면보다 길면 장 안에서 세로로 스크롤된다.
// 이미지를 누르면 검정 배경 전체화면 뷰어가 열려 확대·축소하고 좌우로 넘겨 볼 수 있다.
export function ImagePager({ images, className }: ImagePagerProps) {
  const { width } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);
  // 비율은 박지 않고 불러온 뒤 실제 크기에서 받아온다 — 이미지마다 비율이 달라도 잘리거나
  // 위아래에 빈 칸이 생기지 않는다. 받기 전에는 높이가 0이라 아무것도 그려지지 않는다.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  // 확대 뷰어 — null이면 닫힘, 숫자면 그 장부터 연다.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <View className={["flex-1", className].filter(Boolean).join(" ")}>
      <PageIndicator count={images.length} current={pageIndex} />
      <ScrollView
        className="mt-5"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // onMomentumScrollEnd는 천천히 끌어서 놓으면(관성이 안 붙으면) 오지 않아서 점이 안 따라온다.
        // 스크롤 중 계속 오는 onScroll로 현재 장을 계산한다.
        scrollEventThrottle={16}
        onScroll={(event) => setPageIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
      >
        {images.map((image, index) => (
          <ScrollView key={image.id} style={{ width }} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => setViewerIndex(index)}>
              <Image
                source={{ uri: image.url }}
                style={{ width, aspectRatio: ratios[image.id] }}
                onLoad={(event) => {
                  const { width: imageWidth, height: imageHeight } = event.nativeEvent.source;
                  setRatios((prev) => ({ ...prev, [image.id]: imageWidth / imageHeight }));
                }}
              />
            </Pressable>
          </ScrollView>
        ))}
      </ScrollView>
      <ChatImageViewer
        urls={images.map((image) => image.url)}
        startIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}
