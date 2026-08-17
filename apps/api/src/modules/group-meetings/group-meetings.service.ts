import { Injectable, NotFoundException } from '@nestjs/common';
import type { GroupMeeting, GroupMeetingDetail } from '@onnuri/shared';

// DB 마이그레이션이 아직 없어(ARCHITECTURE.md Known Issues) 임시 하드코딩 데이터로 응답한다.
// 소그룹 모임 스키마가 정해지면 PrismaService 조회로 교체한다.
// 카드에 겹쳐 보여줄 참여자 프로필 3장. 목업이라 모임마다 같은 사람을 쓴다.
const MEETING_AVATARS = [
  'https://picsum.photos/seed/member-1/80/80',
  'https://picsum.photos/seed/member-2/80/80',
  'https://picsum.photos/seed/member-3/80/80',
];

const MOCK_MEETINGS: Omit<GroupMeeting, 'statusLabel'>[] = [
  {
    id: '1',
    category: '매일 오운완 챌린지',
    title: '운동 헬스 인증방',
    deadline: '2026-07-31',
    status: 'open',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-1/600/600',
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
  {
    id: '2',
    category: '풍성한 식탁교제',
    title: '맛집 탐방',
    deadline: '2026-07-31',
    status: 'closed',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-2/600/600',
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
  {
    id: '3',
    category: '온누리 러닝 크루',
    title: '뜀',
    deadline: '2026-07-31',
    status: 'open',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-3/600/600',
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
  {
    id: '4',
    category: '스매시 한 방, 스트레스 아웃',
    title: '493km/h',
    deadline: '2026-07-31',
    status: 'open',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-4/600/600',
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
  {
    id: '5',
    category: '나만의 키링 만들기',
    title: '키링 아뜰리에',
    deadline: '2026-07-31',
    status: 'closed',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-5/600/600',
    participantCount: 3,
    participantAvatarUrls: MEETING_AVATARS,
  },
];

const MOCK_PHOTO_TOTAL = Array.from({ length: 12 });

// 상세 페이지에만 있는 필드. 목록 목업에 얹어서 응답을 만든다.
const MOCK_DETAIL_EXTRA = {
  periodLabel: '7/1 ~ 7/28',
  schedule: '매주 토요일 6시',
  place: '매주 다른 동네 맛집',
  cost: '1/N 자유정산',
  // 화면이 폭에 따라 몇 장을 보여줄지 정하므로(넓은 화면일수록 더 많이) 목록을 넉넉히 내려준다.
  // 첫 장이 큰 사진이고 캡션이 붙는다.
  photos: MOCK_PHOTO_TOTAL.map((_, index) => ({
    id: `p${index + 1}`,
    url: `https://picsum.photos/seed/photo-${index + 1}/600/400`,
    caption: index === 0 ? '여름 수련회 찬양 · 7월' : null,
  })),
  photoCount: MOCK_PHOTO_TOTAL.length,
  comments: [
    {
      id: 'c1',
      authorName: '온누리',
      authorAvatarUrl: 'https://picsum.photos/seed/comment-1/80/80',
      timeAgo: '2분 전',
      content: '저도 참여하고 싶어요!',
    },
    {
      id: 'c2',
      authorName: '남지연',
      authorAvatarUrl: null,
      timeAgo: '1분 전',
      content: '이번주는 어디로 가나요?',
    },
    {
      id: 'c3',
      authorName: '김현준',
      authorAvatarUrl: null,
      timeAgo: '1분 전',
      content: '이번주 토요일은 전포로 갑니다~!',
    },
  ],
};

@Injectable()
export class GroupMeetingsService {
  findAll(): GroupMeeting[] {
    // 사용자에게 보이는 상태 문구는 프론트가 아니라 여기서 계산한다 (ARCHITECTURE.md App Responsibilities).
    return MOCK_MEETINGS.map((meeting) => ({
      ...meeting,
      statusLabel: meeting.status === 'open' ? '모집중' : '마감',
    }));
  }

  findOne(id: string): GroupMeetingDetail {
    const meeting = MOCK_MEETINGS.find((item) => item.id === id);
    if (!meeting) {
      throw new NotFoundException('모임을 찾을 수 없습니다.');
    }

    return {
      ...meeting,
      statusLabel: meeting.status === 'open' ? '모집중' : '마감',
      heroImageUrl: meeting.thumbnailUrl,
      ...MOCK_DETAIL_EXTRA,
    };
  }
}
