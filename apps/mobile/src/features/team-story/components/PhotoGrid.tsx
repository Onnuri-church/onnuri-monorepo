import { Image, Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

export interface GridPhoto {
  id: string;
  url: string | null;
}

interface PhotoGridProps {
  /** 묶음 이름. 시안은 월 단위다 (예: "2026년 7월"). */
  label: string;
  photos: GridPhoto[];
  onPhotoPress?: (id: string) => void;
  /** 선택 모드. 고른 칸에만 딤·테두리·체크가 붙는다 (시안: 안 고른 칸은 아무 표시도 없다). */
  selecting?: boolean;
  selectedIds?: string[];
  /** 첫 칸을 차지하는 "추가" 슬롯 (시안 갤러리-관리). 안 넘기면 안 그린다. */
  onAddPress?: () => void;
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
export function PhotoGrid({
  label,
  photos,
  onPhotoPress,
  selecting = false,
  selectedIds = [],
  onAddPress,
}: PhotoGridProps) {
  // 추가 슬롯은 첫 칸을 차지한다 — null을 앞에 끼워 넣고 렌더에서 구분한다.
  const slots: (GridPhoto | null)[] = onAddPress ? [null, ...photos] : photos;
  const rows = chunk(slots, COLUMNS);

  return (
    <View className="gap-0.5">
      <Text className="text-body-main text-text-normal">{label}</Text>
      <View className="gap-1">
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-1">
            {row.map((photo) =>
              photo === null ? (
                <Pressable
                  key="add"
                  className="aspect-square flex-1 items-center justify-center border border-dashed border-text-alternative"
                  onPress={onAddPress}
                >
                  <Icon name="add-round-light" size={24} />
                  <Text className="mt-px text-caption-main text-text-alternative">추가</Text>
                </Pressable>
              ) : (
                <Pressable
                  key={photo.id}
                  className="aspect-square flex-1 bg-text-assistive"
                  onPress={() => onPhotoPress?.(photo.id)}
                >
                  {/* 목업 사진은 url이 없어 회색 칸으로 남는다 — 방금 올린 사진만 그려진다. */}
                  {photo.url && (
                    <Image
                      source={{ uri: photo.url }}
                      className="absolute inset-0"
                      resizeMode="cover"
                    />
                  )}
                  {selecting && selectedIds.includes(photo.id) && <SelectedOverlay />}
                </Pressable>
              ),
            )}
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

// 고른 칸 위에 얹는 표시 (시안: 검정 20% 딤 + 2px primary 테두리 + 우상단 체크).
// 딤은 색+opacity를 style로 준다 — 셀 갤러리(GalleryMonthGrid)가 쓰는 방식과 같다.
function SelectedOverlay() {
  return (
    <View className="absolute inset-0 items-end p-2">
      <View
        className="absolute inset-0"
        style={{ backgroundColor: colors.text.normal, opacity: 0.2 }}
      />
      <View className="absolute inset-0 border-2 border-primary-normal" />
      <View className="h-6 w-6 items-center justify-center rounded-full bg-primary-normal">
        <Icon name="check" size={14} color={colors.icon.disable} />
      </View>
    </View>
  );
}
