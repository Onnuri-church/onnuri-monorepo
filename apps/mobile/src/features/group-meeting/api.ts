import type { GroupMeeting, GroupMeetingDetail } from "@onnuri/shared";

// API 연동 전 임시 데이터. 서버를 따로 띄우지 않아도 화면을 확인할 수 있게 앱 안에서 돌려준다
// (부서활동 게시판과 같은 방식). 소그룹 모임 API(GET /group-meetings, /:id)는 이미 apps/api에
// 있으므로, 연동할 때 아래 두 함수 본문만 apiClient 호출로 바꾸고 이 파일의 목업을 지우면 된다.

// 카드에 겹쳐 보여줄 참여자 프로필 3장. 목업이라 모임마다 같은 사람을 쓴다.
const MEETING_AVATARS = [
  "https://picsum.photos/seed/member-1/80/80",
  "https://picsum.photos/seed/member-2/80/80",
  "https://picsum.photos/seed/member-3/80/80",
];

const MOCK_MEETINGS: Omit<GroupMeeting, "statusLabel">[] = [
  {
    id: "1",
    category: "매일 오운완 챌린지",
    title: "운동 헬스 인증방",
    deadline: "2026-07-31",
    status: "open",
    thumbnailUrl: "https://picsum.photos/seed/meeting-1/600/600",
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
  {
    id: "2",
    category: "풍성한 식탁교제",
    title: "맛집 탐방",
    deadline: "2026-07-31",
    status: "closed",
    thumbnailUrl: "https://picsum.photos/seed/meeting-2/600/600",
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
  {
    id: "3",
    category: "온누리 러닝 크루",
    title: "뜀",
    deadline: "2026-07-31",
    status: "open",
    thumbnailUrl: "https://picsum.photos/seed/meeting-3/600/600",
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
  {
    id: "4",
    category: "스매시 한 방, 스트레스 아웃",
    title: "493km/h",
    deadline: "2026-07-31",
    status: "open",
    thumbnailUrl: "https://picsum.photos/seed/meeting-4/600/600",
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
  {
    id: "5",
    category: "나만의 키링 만들기",
    title: "키링 아뜰리에",
    deadline: "2026-07-31",
    status: "closed",
    thumbnailUrl: "https://picsum.photos/seed/meeting-5/600/600",
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
];

const MOCK_PHOTOS = Array.from({ length: 12 }, (_, index) => ({
  id: `p${index + 1}`,
  url: `https://picsum.photos/seed/photo-${index + 1}/600/400`,
  caption: index === 0 ? "여름 수련회 찬양 · 7월" : null,
}));

const MOCK_DETAIL_EXTRA = {
  periodLabel: "7/1 ~ 7/28",
  schedule: "매주 토요일 6시",
  place: "매주 다른 동네 맛집",
  cost: "1/N 자유정산",
  photos: MOCK_PHOTOS,
  photoCount: MOCK_PHOTOS.length,
  comments: [
    {
      id: "c1",
      authorName: "온누리",
      authorAvatarUrl: "https://picsum.photos/seed/comment-1/80/80",
      timeAgo: "2분 전",
      content: "저도 참여하고 싶어요!",
    },
    {
      id: "c2",
      authorName: "남지연",
      authorAvatarUrl: null,
      timeAgo: "1분 전",
      content: "이번주는 어디로 가나요?",
    },
    {
      id: "c3",
      authorName: "김현준",
      authorAvatarUrl: null,
      timeAgo: "1분 전",
      content: "이번주 토요일은 전포로 갑니다~!",
    },
  ],
};

// 배지에 그대로 찍히는 문구. 연동 후에는 서버가 계산해서 내려준다
// (ARCHITECTURE.md App Responsibilities) — 화면은 지금도 이 값을 그대로 쓴다.
function withStatusLabel(meeting: Omit<GroupMeeting, "statusLabel">): GroupMeeting {
  return { ...meeting, statusLabel: meeting.status === "open" ? "모집중" : "마감" };
}

export async function fetchGroupMeetings(): Promise<GroupMeeting[]> {
  return MOCK_MEETINGS.map(withStatusLabel);
}

export async function fetchGroupMeetingDetail(id: string): Promise<GroupMeetingDetail> {
  const meeting = MOCK_MEETINGS.find((item) => item.id === id);
  if (!meeting) {
    throw new Error("모임을 찾을 수 없습니다.");
  }

  return {
    ...withStatusLabel(meeting),
    heroImageUrl: meeting.thumbnailUrl,
    ...MOCK_DETAIL_EXTRA,
  };
}
