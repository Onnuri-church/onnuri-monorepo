import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { ImagePager } from "../../shared/components/base/ImagePager";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchBulletin } from "./api";

// 나눔지. 주보 상세와 화면이 같아서 ImagePager를 함께 쓰고, 여기서는 데이터만 고른다.
// 주보와 한 응답(GET /bulletins/:id)에 같이 와서 캐시도 주보 상세와 같이 쓴다.
// 나눔지에만 붙는 것(본문·나눔 질문 등)이 생기면 이 파일에만 더하면 된다.
export function SharingSheetScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "SharingSheet">>();
  const { data, isPending, isError } = useQuery({
    queryKey: ["bulletin", params.id],
    queryFn: () => fetchBulletin(params.id),
  });

  if (isPending) return <View className="flex-1 bg-background-normal" />;

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-normal">
        <Text className="text-body-medium text-text-alternative">나눔지를 불러오지 못했어요</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-normal">
      <ImagePager className="mt-6" images={data.handoutImages} />
    </View>
  );
}
