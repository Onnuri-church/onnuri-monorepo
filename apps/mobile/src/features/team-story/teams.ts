import type { Icon } from "../../shared/components/base/Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

// API 연동 전 임시 데이터. 팀 엔드포인트가 생기면 이 파일을 통째로 교체한다.
// 목록·상세·팀원 리스트가 같은 팀을 보여줘야 해서 한 곳에 둔다.
// id는 부서활동 게시판(TeamPostCard의 DEPARTMENT_COLOR)이 쓰는 부서 키와 같은 값으로 맞춘다 —
// 같은 부서를 두 화면이 다른 이름으로 부르지 않게 한다.
export interface Team {
  id: string;
  name: string;
  description: string;
  icon: IconName;
}

export const TEAMS: Team[] = [
  { id: "design", name: "디자인팀", description: "부서 콘텐츠와 홍보물을 디자인해요", icon: "palette" },
  { id: "broadcast", name: "방송팀", description: "예배와 행사 영상, 음향 송출을 담당해요", icon: "video-on" },
  { id: "video", name: "영상팀", description: "부서 행사와 활동 모습을 촬영, 편집해요", icon: "media-strip" },
  { id: "intercession", name: "중보기도팀", description: "부서와 지체들을 위해 함께 기도해요", icon: "pray" },
  { id: "praise", name: "찬양팀", description: "예배 찬양을 준비하고 인도해요", icon: "note" },
  { id: "futsal", name: "풋살팀", description: "함께 몸을 움직이며 친교를 나눠요", icon: "soccer" },
  { id: "sns", name: "SNS팀", description: "부서 소식을 온라인으로 전해요", icon: "thumb-up" },
];

export function findTeam(id: string): Team | undefined {
  return TEAMS.find((team) => team.id === id);
}

// 팀 소개 본문. 시안에 디자인팀 문구 하나만 있어서 모든 팀이 같은 글을 쓴다 —
// 팀별 실제 소개글은 API가 내려준다.
export const TEAM_INTRO =
  "부서에 필요한 포스터, 카드뉴스 등 다양한 콘텐츠를 만들어요. 매주 필요한 디자인 요청을 받아 함께 논의하고 제작해요. 그림이나 편집 툴에 관심 있다면 편하게 들어와도 좋아요.";

export interface TeamMember {
  id: string;
  name: string;
  /** 화면에 그대로 찍는 역할 문구. 서버가 계산해 내려준다. */
  roleLabel: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "1", name: "조인승", roleLabel: "팀장" },
  { id: "2", name: "김예준", roleLabel: "팀원" },
  { id: "3", name: "김연정", roleLabel: "팀원" },
  { id: "4", name: "김영주", roleLabel: "팀원" },
  { id: "5", name: "김지은", roleLabel: "팀원" },
  { id: "6", name: "김현수", roleLabel: "팀원" },
  { id: "7", name: "남현지", roleLabel: "팀원" },
  { id: "8", name: "우성윤", roleLabel: "팀원" },
  { id: "9", name: "손호영", roleLabel: "팀원" },
];

// 활동 사진. 실제 이미지가 없어서 URL은 비워두고 회색 자리만 보이게 한다.
export const TEAM_PHOTOS = [
  { id: "p1", url: null, caption: "2026 여름수련회 첫째날 · 8월" },
  { id: "p2", url: null },
  { id: "p3", url: null },
  { id: "p4", url: null },
];

export const TEAM_PHOTO_TOTAL = 12;
