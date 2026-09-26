// API 연동 전 임시 데이터. 팀원 관리·추가 화면이 아직 목업을 쓴다 (SCRUM-130에서 교체).
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

// 팀원 추가 화면의 후보 명단. 유저 검색 API가 생기면 교체한다.
// affiliation은 그 사람이 이미 속한 팀 이름이고, 없으면 "소속 팀 없음"이다 (시안 문구).
export interface MemberCandidate {
  id: string;
  name: string;
  affiliation: string;
}

export const MEMBER_CANDIDATES: MemberCandidate[] = [
  { id: "c1", name: "고다원", affiliation: "소속 팀 없음" },
  { id: "c2", name: "윤채원", affiliation: "디자인팀" },
  { id: "c3", name: "조은서", affiliation: "소속 팀 없음" },
  { id: "c4", name: "한지우", affiliation: "영상팀" },
  { id: "c5", name: "오시현", affiliation: "소속 팀 없음" },
  { id: "c6", name: "배주원", affiliation: "찬양팀" },
  { id: "c7", name: "서다인", affiliation: "소속 팀 없음" },
  { id: "c8", name: "임하늘", affiliation: "풋살팀" },
  { id: "c9", name: "노건우", affiliation: "소속 팀 없음" },
  { id: "c10", name: "정소율", affiliation: "SNS팀" },
];
