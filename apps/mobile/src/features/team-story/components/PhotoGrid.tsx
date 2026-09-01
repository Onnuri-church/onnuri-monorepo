import { Pressable, Text, View } from "react-native";

export interface GridPhoto {
  id: string;
  url: string | null;
}

interface PhotoGridProps {
  /** 묶음 이름. 시안은 월 단위다 (예: "2026년 7월"). */
  label: string;
  photos: GridPhoto[];
  onPhotoPress?: (id: string) => void;
}

const COLUMNS = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

// 갤러리의 한 묶음(월). 3열로 사진을 깔고 위에 묶음 이름을 붙인다.
// 폭은 호출부가 정하고 칸은 flex-1로 3등분한다 — 시안이 402pt 기준 117.33이라 화면 폭에 따라 달라진다.
// 칸 간격은 시안 5인데 4px 스케일에 없어서 4(gap-1)로 뒀다 — 확정값 확인 후 조정한다.
export function PhotoGrid({ label, photos, onPhotoPress }: PhotoGridProps) {
  const rows = chunk(photos, COLUMNS);

  return (
    <View className="gap-0.5">
      <Text className="text-body-main text-text-normal">{label}</Text>
      <View className="gap-1">
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-1">
            {row.map((photo) => (
              <Pressable
                key={photo.id}
                className="aspect-square flex-1 bg-text-assistive"
                onPress={() => onPhotoPress?.(photo.id)}
              />
            ))}
            {/* 마지막 줄이 3장을 못 채우면 빈 칸으로 메워 왼쪽 정렬을 유지한다. */}
            {Array.from({ length: COLUMNS - row.length }).map((_, index) => (
              <View key={`blank-${index}`} className="flex-1" />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
