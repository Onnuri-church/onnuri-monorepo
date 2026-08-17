import { ScrollView } from "react-native";

import { TeamListItem } from "./components/TeamListItem";

// API 연동 전 임시 데이터. 팀 목록 엔드포인트가 생기면 교체한다.
// id는 부서활동 게시판(TeamPostCard의 DEPARTMENT_COLOR)이 쓰는 부서 키와 같은 값으로 맞춘다 —
// 같은 부서를 두 화면이 다른 이름으로 부르지 않게 한다.
const TEAMS = [
  { id: "design", name: "디자인팀", description: "부서 콘텐츠와 홍보물을 디자인해요", icon: "palette" },
  { id: "broadcast", name: "방송팀", description: "예배와 행사 영상, 음향 송출을 담당해요", icon: "video-on" },
  { id: "video", name: "영상팀", description: "부서 행사와 활동 모습을 촬영, 편집해요", icon: "media-strip" },
  { id: "intercession", name: "중보기도팀", description: "부서와 지체들을 위해 함께 기도해요", icon: "pray" },
  { id: "praise", name: "찬양팀", description: "예배 찬양을 준비하고 인도해요", icon: "note" },
  { id: "futsal", name: "풋살팀", description: "함께 몸을 움직이며 친교를 나눠요", icon: "soccer" },
  { id: "sns", name: "SNS팀", description: "부서 소식을 온라인으로 전해요", icon: "thumb-up" },
] as const;

// 행을 눌렀을 때 가는 팀 상세는 아직 없다(SCRUM-32). 그 화면이 생기면 여기서 navigate를 붙인다.
export function TeamStoryScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background-normal"
      contentContainerClassName="gap-4 px-5 pb-6 pt-7"
    >
      {TEAMS.map((team) => (
        <TeamListItem
          key={team.id}
          name={team.name}
          description={team.description}
          icon={team.icon}
        />
      ))}
    </ScrollView>
  );
}
