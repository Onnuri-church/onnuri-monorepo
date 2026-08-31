import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { FilterBar } from "../../shared/components/base/FilterBar";
import { useHideTabBarOnScroll } from "../../shared/hooks/useHideTabBarOnScroll";
import type { RootStackParamList } from "../../shared/types/navigation";
import { SermonVideoCard, type SermonVideo } from "./components/SermonVideoCard";

// API 연동 전 임시 데이터. 상세 화면도 같은 영상을 봐야 해서 export한다.
//
// 값은 교회 유튜브 채널(@onnuri_youth)에서 실제로 받아온 것을 옮겨 적었다 — 제목은 유튜브 원본이
// 아니라 "본문구절ㅣ설교제목"으로 정리된 형태다. 유튜브 제목은 시기마다 표기가 달라서(구분자가
// |와 /로 섞이고 설교자가 빠진 회차도 있다) 그대로는 카드에 못 넣는다. 이 가공은 서버가 맡는다.
//
// 첫 항목만 라이브로 둔다 — 시안의 LIVE 배지·시청자수·라이브 안내문구를 확인하기 위해서다.
// 같은 날짜가 두 번 나오는 건 오타가 아니다. 방송이 끊겨 다시 켠 회차가 실제로 있다.
export const SERMON_VIDEOS: SermonVideo[] = [
  {
    id: "ryFQisukMd8",
    title: "마태복음 6장 8-9절ㅣ나를 따르라 #21 누군지를 알아야 하지",
    preacher: "원준호 목사",
    date: "2026.08.30",
    serviceName: "주일 4부 예배",
    dateTimeLabel: "2026.08.30 (일) 오후 2:01",
    thumbnailUrl: "https://i.ytimg.com/vi/ryFQisukMd8/mqdefault.jpg",
    isLive: true,
    viewCount: "10K",
  },
  {
    id: "8ppIsT8QJ0I",
    title: "다니엘 1장 1-2절ㅣ세상을 사는 지혜",
    preacher: "원준호 목사",
    date: "2026.08.23",
    serviceName: "주일 4부 예배",
    dateTimeLabel: "2026.08.23 (일) 오후 2:00",
    thumbnailUrl: "https://i.ytimg.com/vi/8ppIsT8QJ0I/mqdefault.jpg",
  },
  {
    id: "RzfZpscqTgM",
    title: "마태복음 6장 5-8절ㅣ나를 따르라 #20 친밀함으로의 초대",
    preacher: "원준호 목사",
    date: "2026.08.09",
    serviceName: "주일 4부 예배",
    dateTimeLabel: "2026.08.09 (일) 오후 2:01",
    thumbnailUrl: "https://i.ytimg.com/vi/RzfZpscqTgM/mqdefault.jpg",
  },
  {
    id: "0j_4cKmln2g",
    title: "마태복음 6장 1-4절ㅣ나를 따르라 #19 경건",
    preacher: "원준호 목사",
    date: "2026.08.02",
    serviceName: "주일 4부 예배",
    dateTimeLabel: "2026.08.02 (일) 오후 2:01",
    thumbnailUrl: "https://i.ytimg.com/vi/0j_4cKmln2g/mqdefault.jpg",
  },
  {
    id: "XjAL0Uljl1w",
    title: "마태복음 5장 43-48절ㅣ나를 따르라 #18 어떻게 원수까지 사랑하겠어",
    preacher: "원준호 목사",
    date: "2026.07.26",
    serviceName: "주일 4부 예배",
    dateTimeLabel: "2026.07.26 (일) 오후 2:04",
    thumbnailUrl: "https://i.ytimg.com/vi/XjAL0Uljl1w/mqdefault.jpg",
  },
  {
    id: "8_HDvnT8eSs",
    title: "마태복음 5장 43-48절ㅣ나를 따르라 #18 어떻게 원수까지 사랑하겠어",
    preacher: "원준호 목사",
    date: "2026.07.26",
    serviceName: "주일 4부 예배",
    dateTimeLabel: "2026.07.26 (일) 오후 2:02",
    thumbnailUrl: "https://i.ytimg.com/vi/8_HDvnT8eSs/mqdefault.jpg",
  },
];

// 월 목록은 박아두지 않고 영상 날짜에서 뽑는다 — 채널에 없는 달을 눌러 빈 목록을 보게 되거나,
// 새 달이 올라왔는데 목록에 없는 일이 생기지 않는다. date가 "2026.08.09" 꼴이라 앞 7자가 곧 월이다.
function getMonths(videos: SermonVideo[]) {
  const months = [...new Set(videos.map((video) => video.date.slice(0, 7)))].sort().reverse();
  return months.map((value) => {
    const [year, month] = value.split(".");
    return { value, label: `${year.slice(2)}년 ${Number(month)}월` };
  });
}

const MONTHS = getMonths(SERMON_VIDEOS);

// 말씀 게시판. 월 필터 아래로 설교영상 카드가 쌓인다.
export function SermonScreen() {
  // 처음에는 가장 최근 달을 본다.
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]?.value ?? "");
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // 하단 탭 화면이라 스크롤 내리면 탭바를 숨긴다 (셀·마이페이지와 동일).
  const handleHideTabBarScroll = useHideTabBarOnScroll();

  const visibleVideos = SERMON_VIDEOS.filter((video) => video.date.startsWith(selectedMonth));

  return (
    <View className="flex-1 bg-background-page">
      <FilterBar items={MONTHS} selected={selectedMonth} onSelect={setSelectedMonth} />
      {/* 시안의 필터-목록 간격 36 중 16은 FilterBar가 자기 padding으로 갖고 있어서 20만 더한다. */}
      <ScrollView
        contentContainerClassName="gap-7 px-5 pb-6 pt-5"
        onScroll={handleHideTabBarScroll}
        scrollEventThrottle={16}
      >
        {visibleVideos.map((video) => (
          <SermonVideoCard
            key={video.id}
            video={video}
            onPress={() => navigation.navigate("SermonDetail", { id: video.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
