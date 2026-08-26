import { Pressable, Text, View } from "react-native";

import { Icon } from "../../../shared/components/base/Icon";
import { Thumbnail } from "../../../shared/components/base/Thumbnail";

export interface ActivityPhoto {
  id: string;
  url: string | null;
  /** 사진 위에 겹쳐 보여줄 설명. 큰 사진에만 붙는다. */
  caption?: string | null;
}

interface ActivityPhotosProps {
  /** 앞에서부터 큰 사진 1장 + 작은 사진 3장을 쓴다. 나머지는 "+N"으로 접힌다. */
  photos: ActivityPhoto[];
  /** photos에 다 담기지 않은 것까지 포함한 전체 장수. */
  totalCount: number;
  onViewAllPress?: () => void;
}

// 시안 확정값에서 온 비율. 큰 사진 362x184, 작은 사진 115x95.
const LARGE_RATIO = 362 / 184;
const SMALL_RATIO = 115 / 95;
const SMALL_COUNT = 3;

// 팀 상세의 활동 사진 섹션. 큰 사진 한 장 아래 작은 사진 세 장이 오고, 마지막 칸에 남은 장수를 겹친다.
// 사진에 캡션·장수가 있다는 걸 아는 도메인 컴포넌트라 feature에 둔다.
export function ActivityPhotos({ photos, totalCount, onViewAllPress }: ActivityPhotosProps) {
  const [large, ...rest] = photos;
  const small = rest.slice(0, SMALL_COUNT);
  // 마지막 작은 칸에 겹칠 남은 장수. 큰 1장 + 작은 3장을 뺀 나머지다.
  const remaining = totalCount - 1 - small.length;

  return (
    <View className="gap-3">
      <Text className="text-heading-small text-text-normal">활동 사진</Text>
      <View>
        {/* 시안은 큰 사진 아래쪽에 그라데이션을 깔아 캡션을 읽히게 한다 — 토큰도 없고
            expo-linear-gradient도 안 깔려 있어서 이번 범위에서 뺐다. 확정되면 여기 얹는다. */}
        <Thumbnail
          className="rounded-5"
          ratio={LARGE_RATIO}
          source={large?.url ? { uri: large.url } : undefined}
          caption={large?.caption ?? undefined}
        />
        <View className="mt-2 flex-row gap-2.25">
          {small.map((photo, index) => (
            <Thumbnail
              key={photo.id}
              className="flex-1 rounded-5"
              ratio={SMALL_RATIO}
              source={photo.url ? { uri: photo.url } : undefined}
              overlayCount={
                index === small.length - 1 && remaining > 0 ? remaining : undefined
              }
            />
          ))}
        </View>
        <Pressable
          className="mt-6 flex-row items-center justify-center gap-0.5"
          onPress={onViewAllPress}
        >
          <Text className="text-body-small text-text-alternative">
            사진 {totalCount}장 모두 보기
          </Text>
          <Icon name="expand-right" size={18} />
        </Pressable>
      </View>
    </View>
  );
}
