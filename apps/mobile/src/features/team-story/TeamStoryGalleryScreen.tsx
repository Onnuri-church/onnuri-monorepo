import { ScrollView, Text, View } from "react-native";

import { PhotoGrid } from "./components/PhotoGrid";
import { TEAM_PHOTO_GROUPS, TEAM_PHOTO_TOTAL } from "./teams";

// 어느 팀인지는 라우트 파라미터(teamId)로 받지만, 목업이 팀별로 나뉘어 있지 않아 아직 쓰지 않는다.
// 사진 API가 생기면 그때 파라미터로 조회한다.
// 사진을 누르면 뷰어(SCRUM-86)로 가야 하는데 그 화면이 아직 없어서 연결하지 않았다.
export function TeamStoryGalleryScreen() {
  return (
    <ScrollView className="flex-1 bg-background-normal" contentContainerClassName="px-5 pb-6">
      {/* 헤더 바로 아래 가운데 정렬 (시안 확정값) */}
      <Text className="text-center text-caption-main text-text-alternative">
        전체 {TEAM_PHOTO_TOTAL}장
      </Text>
      <View className="mt-10 gap-9">
        {TEAM_PHOTO_GROUPS.map((group) => (
          <PhotoGrid key={group.label} label={group.label} photos={group.photos} />
        ))}
      </View>
    </ScrollView>
  );
}
