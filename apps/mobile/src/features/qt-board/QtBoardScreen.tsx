import { useState } from "react";
import { ScrollView, View } from "react-native";
import { QtPost, QtPostCard } from "./components/QtPostCard";
import {FilterBar} from "../../shared/components/base/FilterBar";
import {FloatingButton} from "../../shared/components/base/FloatingButton";
import {Icon} from "../../shared/components/base/Icon";
import {colors} from "../../shared/theme/tokens";

// API 연동 전 임시 데이터. 게시글 엔드포인트가 생기면 교체한다.
const qtPosts: QtPost[] = [
  {
    id: "1",
    author: "원준호",
    date: "2026.05.07",
    title: "절망, 자기 우상화의 열매",
    description:
      "자신의 인생이 텅 비었다고 고백하는 나오미의 판단과 생각과 다르게 하나님은 점차 그를 채워가고 계셨다.",
    favorite: 14,
  },
  {
    id: "2",
    author: "김서연",
    date: "2026.05.06",
    title: "묵묵히 걷는 길 위에서",
    description:
      "당장 답이 보이지 않아도 그 자리를 지키는 것이 믿음이라는 걸 배운다. 조급함을 내려놓는 하루였다.",
    favorite: 8,
  },
  {
    id: "3",
    author: "이정민",
    date: "2026.05.05",
    title: "다시 돌아오는 마음",
    description:
      "멀리 돌아왔지만 늦지 않았다고 말씀하시는 것 같았다. 돌아설 수 있는 것 자체가 은혜였다.",
    favorite: 21,
  },
  {
    id: "3",
    author: "이정민",
    date: "2026.05.05",
    title: "다시 돌아오는 마음",
    description:
        "멀리 돌아왔지만 늦지 않았다고 말씀하시는 것 같았다. 돌아설 수 있는 것 자체가 은혜였다.",
    favorite: 21,
  },
  {
    id: "3",
    author: "이정민",
    date: "2026.05.05",
    title: "다시 돌아오는 마음",
    description:
        "멀리 돌아왔지만 늦지 않았다고 말씀하시는 것 같았다. 돌아설 수 있는 것 자체가 은혜였다.",
    favorite: 21,
  },
];

// 월 목록도 임시. 게시글 엔드포인트가 생기면 실제 데이터에서 뽑는다.
const months = [
  { value: "2026.05", label: "26년 5월" },
  { value: "2026.04", label: "26년 4월" },
  { value: "2026.03", label: "26년 3월" },
  { value: "2026.02", label: "26년 2월" },
  { value: "2026.01", label: "26년 1월" },
];

const onPress = () => {
  console.log("카드 클릭")
}

const handleWritePress = () => {
  console.log("글쓰기")
}

export function QtBoardScreen() {
  const [month, setMonth] = useState(months[0].value);
  const visiblePosts = qtPosts.filter((post) => post.date.startsWith(month));

  return (
    <View className="flex-1 bg-background-normal">
      <FilterBar items={months} selected={month} onSelect={setMonth} />
      <ScrollView contentContainerClassName="gap-4 pt-3 px-5 py-4">
        {visiblePosts.map((post) => (
          <QtPostCard key={post.id} post={post} onPress={onPress}/>
        ))}
      </ScrollView>
      <FloatingButton onPress={handleWritePress}>
        <Icon name="write" color={colors.icon.disable}/>
      </FloatingButton>
    </View>
  );
}
