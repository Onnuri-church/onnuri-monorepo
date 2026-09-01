import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";

import { PhotoGrid } from "./components/PhotoGrid";
import { TEAM_PHOTO_GROUPS, TEAM_PHOTO_TOTAL } from "./teams";
import type { RootStackParamList } from "../../shared/types/navigation";

// 목업이 팀별로 나뉘어 있지 않아 teamId로 조회하지는 않는다. 사진 API가 생기면 그때 쓴다.
export function TeamStoryGalleryScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "TeamStoryGallery">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePhotoPress = (photoId: string) =>
    navigation.navigate("TeamStoryPhotoViewer", { teamId: params.teamId, photoId });

  return (
    <ScrollView className="flex-1 bg-background-normal" contentContainerClassName="px-5 pb-6">
      {/* 헤더 바로 아래 가운데 정렬 (시안 확정값) */}
      <Text className="text-center text-caption-main text-text-alternative">
        전체 {TEAM_PHOTO_TOTAL}장
      </Text>
      <View className="mt-10 gap-9">
        {TEAM_PHOTO_GROUPS.map((group) => (
          <PhotoGrid
            key={group.label}
            label={group.label}
            photos={group.photos}
            onPhotoPress={handlePhotoPress}
          />
        ))}
      </View>
    </ScrollView>
  );
}
