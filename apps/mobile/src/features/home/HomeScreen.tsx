import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { PageIndicator } from "../../shared/components/base/PageIndicator";
import { useHideTabBarOnScroll } from "../../shared/hooks/useHideTabBarOnScroll";
import type { RootStackParamList } from "../../shared/types/navigation";
import { fetchPrayers } from "../prayer-board/api";
import { PrayerCard } from "../prayer-board/components/PrayerCard";
import { useHomeBanner } from "./api";
import { DepartmentActivityCard } from "./components/DepartmentActivityCard";
import { QtShareRow } from "./components/QtShareRow";
import { SectionHeader } from "./components/SectionHeader";
import { WeeklySermonBanner } from "./components/WeeklySermonBanner";

// 화면 좌우 여백 (시안 확정값 20). 기도제목 캐러셀은 한 장 폭을 이 값에서 계산한다.
const SCREEN_PADDING = 20;
// 취향 소그룹 띠배너 시안 확정값 362x104. 폭은 좌우 여백이 정하므로 비율로만 고정한다.
const GROUP_BANNER_ASPECT_RATIO = 362 / 104;

// 관리자가 등록한 배너가 하나도 없을 때의 기본 문구 (홈 배너 관리에서 등록하면 교체된다).
const DEFAULT_SERMON = {
  seriesLabel: "8월 설교 시리즈",
  passage: "마태복음 6:5-8",
  title: "나를 따르라",
};

// 홈 캐러셀에 보여줄 장수 — 시안이 3장 기준이다.
const PRAYER_CAROUSEL_SIZE = 3;

const QT_SHARES = [
  { id: "1", author: "원준호", passage: "룻기 2:16-23", title: "절망, 자기 우상화의 열매" },
  { id: "2", author: "이윤아", passage: "룻기 3:1-13", title: "그토록 붙잡고 싶으신 당신" },
  { id: "3", author: "김서연", passage: "룻기 4:1-12", title: "돌아설 수 있다는 것이 은혜" },
];

// department는 부서 키다 — 배지 색이 부서활동 게시판과 같은 매핑을 타도록 이름이 아니라 키를 준다.
const DEPARTMENT_ACTIVITIES = [
  { id: "1", department: "praise", departmentName: "찬양팀", title: "5월 연습 공지" },
  { id: "2", department: "futsal", departmentName: "풋살팀", title: "5월 연습 공지" },
  { id: "3", department: "intercession", departmentName: "중보기도팀", title: "5월 연습 공지" },
];

// 하단 탭 "홈". 상단 헤더(로고·QR·알림·설정)와 하단 탭바는 네비게이터가 그리므로 여기서는 본문만 그린다.
//
// 여백은 시안 값이 4px 스케일에서 1px 벗어난 경우(31·33·35·15·17·23) 스케일 값으로 맞췄고,
// 양쪽에서 2px 떨어져 정할 수 없는 46만 tokens.js의 spacing에 등록했다 (mt-11.5).
export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const handleHideTabBarScroll = useHideTabBarOnScroll();
  const [prayerPage, setPrayerPage] = useState(0);

  // 홈 배너 — 관리자가 홈 배너 관리에서 등록한 최신 1건 (말씀 텍스트형 또는 포스터형).
  const { data: banner } = useHomeBanner();

  // 기도제목 최신 3건 — 게시판과 같은 목록 API를 쓴다. 홈 카드는 작성일·D-day를 쓰지 않으므로
  // (그 자리에 페이지 인디케이터가 온다 — 시안) 라벨을 떼서 날짜 줄이 그려지지 않게 한다.
  // ["prayers"] 프리픽스라 게시판에서 등록·삭제하면 홈도 같이 갱신된다.
  const { data: prayers } = useQuery({
    queryKey: ["prayers", "home"],
    queryFn: async () => {
      const { items } = await fetchPrayers("all");
      return items
        .slice(0, PRAYER_CAROUSEL_SIZE)
        .map((prayer) => ({ ...prayer, createdAtLabel: undefined, ddayLabel: undefined }));
    },
  });

  // 캐러셀 한 장의 폭. pagingEnabled가 스크롤뷰 폭 단위로 멈추므로 카드도 같은 폭이어야 한다.
  const prayerPageWidth = width - SCREEN_PADDING * 2;

  // onMomentumScrollEnd는 플랫폼에 따라 안 오는 경우가 있어 onScroll로 매 프레임 계산한다.
  // 같은 값으로 setState하면 React가 리렌더를 건너뛰므로 페이지가 바뀔 때만 다시 그려진다.
  const handlePrayerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPrayerPage(Math.round(event.nativeEvent.contentOffset.x / prayerPageWidth));
  };

  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="pb-10"
      onScroll={handleHideTabBarScroll}
      scrollEventThrottle={16}
    >
      <View className="px-5 pt-8">
        {banner?.kind === "POSTER" && banner.imageUrl !== null ? (
          /* 포스터 배너 — 텍스트 없이 이미지 + 주보 버튼만 남는다 (2026-09-23 확정).
             이미지를 탭하면 원본 비율로 크게 보기. */
          <WeeklySermonBanner
            poster
            imageUrl={banner.imageUrl}
            onPressImage={() =>
              navigation.navigate("BannerViewer", {
                imageUrl: banner.imageUrl as string,
                title: banner.title,
              })
            }
            onPressShortcut={() => navigation.navigate("Bulletin")}
          />
        ) : (
          <WeeklySermonBanner
            seriesLabel={banner?.seriesLabel ?? DEFAULT_SERMON.seriesLabel}
            passage={banner?.passage ?? DEFAULT_SERMON.passage}
            title={banner?.title ?? DEFAULT_SERMON.title}
            imageUrl={banner?.imageUrl ?? undefined}
            onPressShortcut={() => navigation.navigate("Bulletin")}
          />
        )}
      </View>

      <View className="mt-8 px-5">
        <SectionHeader title="기도제목" onPress={() => navigation.navigate("PrayerBoard")} />
        {(prayers ?? []).length === 0 ? (
          <View className="mt-4 items-center py-8">
            <Text className="text-body-medium text-text-alternative">
              등록된 기도제목이 없어요
            </Text>
          </View>
        ) : (
          <View className="mt-4">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handlePrayerScroll}
              scrollEventThrottle={16}
            >
              {(prayers ?? []).map((prayer) => (
                <View key={prayer.id} style={{ width: prayerPageWidth }}>
                  <PrayerCard
                    prayer={prayer}
                    onPress={() => navigation.navigate("PrayerBoardDetail", { id: prayer.id })}
                  />
                </View>
              ))}
            </ScrollView>
            {/* 인디케이터는 카드 위에 얹는다 — 카드 안에 두면 스와이프할 때 카드와 같이 밀린다.
                터치는 아래 카드로 통과시킨다. */}
            <View className="absolute bottom-4 left-0 right-0" pointerEvents="none">
              <PageIndicator count={(prayers ?? []).length} current={prayerPage} />
            </View>
          </View>
        )}
      </View>

      <View className="mt-9 px-5">
        <SectionHeader title="큐티나눔" onPress={() => navigation.navigate("QtBoard")} />
        {/* 큐티나눔에만 헤더 아래·목록 아래 구분선이 있다 (기도제목 섹션은 시안에서 꺼져 있음). */}
        <View className="mt-3.5 h-px bg-background-assistive" />
        {/* 목록만 좌우로 8 더 들어간다 (시안). 행 간격 10은 행 높이를 48로 맞추고도
            목록 전체 높이(164 = 48*3 + 10*2)를 지키기 위한 값이다. */}
        <View className="mt-4 gap-2.5 px-2">
          {QT_SHARES.map((qt) => (
            <QtShareRow
              key={qt.id}
              author={qt.author}
              passage={qt.passage}
              title={qt.title}
              onPress={() => navigation.navigate("QtBoardDetail", { id: qt.id })}
            />
          ))}
        </View>
        <View className="mt-4 h-px bg-background-assistive" />
      </View>

      {/* 취향 소그룹 띠배너. 그림 자체가 배너라서 Thumbnail 같은 공용 컴포넌트를 안 끼우고 바로 그린다. */}
      <View className="mt-11.5 px-5">
        <Pressable
          className="overflow-hidden rounded-5 active:opacity-80"
          style={{ aspectRatio: GROUP_BANNER_ASPECT_RATIO }}
          onPress={() => navigation.navigate("GroupMeeting")}
        >
          {/* 퍼센트 사이즈는 부모 높이가 aspectRatio로 정해질 때 웹에서 어긋나 절대 채움으로 고정한다. */}
          <Image
            source={require("../../shared/assets/banners/group-meeting-banner.png")}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </Pressable>
      </View>

      {/* 가로 스크롤이라 스크롤뷰는 화면 폭을 다 쓰고 좌우 여백은 콘텐츠가 갖는다 —
          그래야 카드가 오른쪽 화면 끝까지 이어진다. */}
      <View className="mt-9">
        <View className="px-5">
          <SectionHeader
            title="부서활동"
            onPress={() => navigation.navigate("DepartmentActivity")}
          />
        </View>
        <ScrollView
          className="mt-4"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5"
        >
          {DEPARTMENT_ACTIVITIES.map((activity) => (
            <DepartmentActivityCard
              key={activity.id}
              department={activity.department}
              departmentName={activity.departmentName}
              title={activity.title}
              onPress={() =>
                navigation.navigate("DepartmentActivityDetail", { id: activity.id })
              }
            />
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}
