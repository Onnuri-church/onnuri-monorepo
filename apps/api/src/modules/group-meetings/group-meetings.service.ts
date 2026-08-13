import { Injectable } from '@nestjs/common';
import type { GroupMeeting } from '@onnuri/shared';

// DB 마이그레이션이 아직 없어(ARCHITECTURE.md Known Issues) 임시 하드코딩 데이터로 응답한다.
// 소그룹 모임 스키마가 정해지면 PrismaService 조회로 교체한다.
const MOCK_MEETINGS: Omit<GroupMeeting, 'statusLabel'>[] = [
  {
    id: '1',
    category: '매일 오운완 챌린지',
    title: '운동 헬스 인증방',
    deadline: '2026-07-31',
    status: 'open',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-1/600/600',
    participantCount: 3,
  },
  {
    id: '2',
    category: '풍성한 식탁교제',
    title: '맛집 탐방',
    deadline: '2026-07-31',
    status: 'closed',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-2/600/600',
    participantCount: 3,
  },
  {
    id: '3',
    category: '온누리 러닝 크루',
    title: '뜀',
    deadline: '2026-07-31',
    status: 'open',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-3/600/600',
    participantCount: 3,
  },
  {
    id: '4',
    category: '스매시 한 방, 스트레스 아웃',
    title: '493km/h',
    deadline: '2026-07-31',
    status: 'open',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-4/600/600',
    participantCount: 3,
  },
  {
    id: '5',
    category: '나만의 키링 만들기',
    title: '키링 아뜰리에',
    deadline: '2026-07-31',
    status: 'closed',
    thumbnailUrl: 'https://picsum.photos/seed/meeting-5/600/600',
    participantCount: 3,
  },
];

@Injectable()
export class GroupMeetingsService {
  findAll(): GroupMeeting[] {
    // 사용자에게 보이는 상태 문구는 프론트가 아니라 여기서 계산한다 (ARCHITECTURE.md App Responsibilities).
    return MOCK_MEETINGS.map((meeting) => ({
      ...meeting,
      statusLabel: meeting.status === 'open' ? '모집중' : '마감',
    }));
  }
}
