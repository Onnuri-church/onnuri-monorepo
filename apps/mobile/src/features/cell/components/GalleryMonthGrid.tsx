import { Image, Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { colors } from "../../../shared/theme/tokens";

export interface GalleryTile {
  id: string;
  /** 사용자가 방금 추가한 사진만 uri가 있다 — 목업 사진은 회색 placeholder로 그린다. */
  uri?: string;
}

const COLUMNS = 3;

interface GalleryMonthGridProps {
  month: string;
  tiles: GalleryTile[];
  /** 선택 모드 — 켜지면 타일마다 체크 오버레이가 붙고 탭이 선택 토글이 된다. */
  selecting: boolean;
  selectedIds: string[];
  onTilePress: (tile: GalleryTile) => void;
  /** 편집 권한이 있을 때 첫 칸에 붙는 "추가" 슬롯 (시안 갤러리-관리). 없으면 안 그린다. */
  onAddPress?: () => void;
}

// 갤러리 탭의 한 달 섹션 (시안: 월 라벨 + 3열 그리드, 타일 119·간격 5 — flex 3등분·gap 4로 근사).
export function GalleryMonthGrid({
  month,
  tiles,
  selecting,
  selectedIds,
  onTilePress,
  onAddPress,
}: GalleryMonthGridProps) {
  // 추가 슬롯은 그리드의 첫 칸을 차지한다 — null을 셀 목록에 끼워 넣고 렌더에서 구분한다.
  const slots: (GalleryTile | null)[] = onAddPress ? [null, ...tiles] : [...tiles];
  const rows: (GalleryTile | null)[][] = [];
  for (let i = 0; i < slots.length; i += COLUMNS) {
    rows.push(slots.slice(i, i + COLUMNS));
  }

  return (
    <View className="gap-2">
      <Text className="text-body-main text-text-normal">{month}</Text>
      <View className="gap-1">
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-1">
            {row.map((tile, colIndex) =>
              tile === null ? (
                <Pressable
                  key="add"
                  className="aspect-square flex-1 items-center justify-center border border-dashed border-icon-normal"
                  onPress={onAddPress}
                >
                  <Icon name="add-round-light" size={24} color={colors.icon.normal} />
                  <Text className="mt-0.5 text-caption-main text-text-alternative">추가</Text>
                </Pressable>
              ) : (
                <Pressable
                  key={tile.id}
                  className="aspect-square flex-1 bg-background-assistive"
                  onPress={() => onTilePress(tile)}
                >
                  {tile.uri && (
                    <Image source={{ uri: tile.uri }} className="absolute inset-0" resizeMode="cover" />
                  )}
                  {selecting && (
                    <SelectionOverlay selected={selectedIds.includes(tile.id)} />
                  )}
                </Pressable>
              ),
            )}
            {/* 마지막 줄이 3칸을 못 채우면 빈 칸으로 폭을 맞춘다 */}
            {Array.from({ length: COLUMNS - row.length }, (_, i) => (
              <View key={`filler-${i}`} className="flex-1" />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// 선택 모드 오버레이 (시안: 선택 시 검정 20% 딤 + 2px primary 테두리 + 체크, 미선택 시 흰 원만).
function SelectionOverlay({ selected }: { selected: boolean }) {
  return (
    <View className="absolute inset-0">
      {selected && (
        <>
          <View
            className="absolute inset-0"
            style={{ backgroundColor: colors.text.normal, opacity: 0.2 }}
          />
          <View className="absolute inset-0 border-2 border-primary-normal" />
        </>
      )}
      <View
        className={`absolute left-2 top-2 h-6 w-6 items-center justify-center rounded-full ${
          selected ? "bg-primary-normal" : "bg-background-normal"
        }`}
      >
        {selected && <Icon name="check" size={14} color={colors.icon.disable} />}
      </View>
    </View>
  );
}
