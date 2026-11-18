import { useState } from "react";
import { Image, Pressable, View } from "react-native";

// 단톡방 사진 묶음 — 카카오톡처럼 말풍선 없이 사진만, 묶음 바깥 모서리만 둥글게 그린다.
// 한 줄에 3장씩 채우고, 남는 장수는 2장 줄로 나눈다 (4장 → 2·2, 5장 → 3·2, 7장 → 3·2·2, 12장 → 3·3·3·3).
// 한 장이면 사진 비율대로 크게 보여준다. 한 메시지에는 최대 12장이 온다.
const GRID_WIDTH = 246;
const GAP = 2;
const RADIUS = 16;

export function photoRows(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 3) return [count];
  if (count === 4) return [2, 2];
  const threes = Math.floor(count / 3);
  const rest = count % 3;
  if (rest === 0) return Array(threes).fill(3);
  if (rest === 2) return [...Array(threes).fill(3), 2];
  // 1장이 남으면 마지막 3장 줄과 합쳐 2·2로 나눈다
  return [...Array(threes - 1).fill(3), 2, 2];
}

interface PhotoGridProps {
  urls: string[];
  onPress: (index: number) => void;
  onLongPress: () => void;
}

export function PhotoGrid({ urls, onPress, onLongPress }: PhotoGridProps) {
  // 한 장일 때만 실제 비율을 쓴다 — 너무 길거나 넓은 사진은 잘라서 적당한 범위로 맞춘다.
  const [ratio, setRatio] = useState(1);

  if (urls.length === 1) {
    const height = GRID_WIDTH / Math.min(1.6, Math.max(0.65, ratio));
    return (
      <Pressable onPress={() => onPress(0)} onLongPress={onLongPress}>
        <Image
          source={{ uri: urls[0] }}
          style={{ width: GRID_WIDTH, height, borderRadius: RADIUS }}
          resizeMode="cover"
          onLoad={(event) => {
            const { width, height: sourceHeight } = event.nativeEvent.source;
            if (width > 0 && sourceHeight > 0) setRatio(width / sourceHeight);
          }}
        />
      </Pressable>
    );
  }

  let start = 0;
  return (
    <View style={{ width: GRID_WIDTH, borderRadius: RADIUS, overflow: "hidden", gap: GAP }}>
      {photoRows(urls.length).map((columns, rowIndex) => {
        const from = start;
        start += columns;
        const size = (GRID_WIDTH - GAP * (columns - 1)) / columns;
        return (
          <View key={rowIndex} className="flex-row" style={{ gap: GAP }}>
            {urls.slice(from, from + columns).map((url, offset) => (
              <Pressable
                key={`${from + offset}-${url}`}
                onPress={() => onPress(from + offset)}
                onLongPress={onLongPress}
              >
                <Image
                  source={{ uri: url }}
                  style={{ width: size, height: size }}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
}
