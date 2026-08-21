import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, View } from "react-native";
import { FloatingButton } from "../../shared/components/base/FloatingButton";
import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import type { RootStackParamList } from "../../shared/types/navigation";
import { TeamPost, TeamPostCard } from "./components/TeamPostCard";

// API 연동 전 임시 데이터.
const cardInfo: TeamPost[] = [
    {
        id: "1",
        department: "sns",
        categoryName: "SNS팀",
        date: "2025.03.27",
        title: "인스타 스토리, 블로그 포스팅 일정",
        description: "오늘 저녁 예배 마치고 혹은 내일까지 가능하시면",
        time: "22시간 전",
        view: 24,
        comments: 3,
        favorite: 5,
    },
    {
        id: "2",
        department: "futsal",
        categoryName: "풋살팀",
        date: "2025.03.27",
        title: "인스타 스토리, 블로그 포스팅 일정",
        description: "오늘 저녁 예배 마치고 혹은 내일까지 가능하시면",
        time: "22시간 전",
        view: 24,
        comments: 3,
        favorite: 5,
    },
    {
        id: "3",
        department: "praise",
        categoryName: "찬양팀",
        date: "2025.03.27",
        title: "인스타 스토리, 블로그 포스팅 일정",
        description: "오늘 저녁 예배 마치고 혹은 내일까지 가능하시면",
        time: "22시간 전",
        view: 24,
        comments: 3,
        favorite: 5,
    },
    {
        id: "3",
        department: "broadcast",
        categoryName: "찬양팀",
        date: "2025.03.27",
        title: "인스타 스토리, 블로그 포스팅 일정",
        description: "오늘 저녁 예배 마치고 혹은 내일까지 가능하시면",
        time: "22시간 전",
        view: 24,
        comments: 3,
        favorite: 5,
    },
    {
        id: "3",
        department: "video",
        categoryName: "찬양팀",
        date: "2025.03.27",
        title: "인스타 스토리, 블로그 포스팅 일정",
        description: "오늘 저녁 예배 마치고 혹은 내일까지 가능하시면",
        time: "22시간 전",
        view: 24,
        comments: 3,
        favorite: 5,
    },
    {
        id: "3",
        department: "praise",
        categoryName: "찬양팀",
        date: "2025.03.27",
        title: "인스타 스토리, 블로그 포스팅 일정",
        description: "오늘 저녁 예배 마치고 혹은 내일까지 가능하시면",
        time: "22시간 전",
        view: 24,
        comments: 3,
        favorite: 5,
    },
]

export function DepartmentActivityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCardPress = (id: string) => {
      navigation.navigate("DepartmentActivityDetail", { id })
  }

    const handleWritePress = () => {
        navigation.navigate("DepartmentActivityWrite")
    }

  return (
      <View className="flex-1 bg-background-normal">
          <ScrollView
              className="flex-1 h-full"
              contentContainerClassName="justify-start pt-14 pb-11 px-5 gap-3"
          >
              {cardInfo.map((post) => (
                  <TeamPostCard key={post.id} post={post} onPress={() => handleCardPress(post.id)}/>
              ))}
          </ScrollView>
          <FloatingButton onPress={handleWritePress}>
              <Icon name="write" color={colors.icon.disable}/>
          </FloatingButton>
      </View>
  );
}
