import { Injectable } from '@nestjs/common';
import type { TeamDetailResponse, TeamRole, TeamSummary } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

// 팀원 정렬: 팀장 → 팀원(이름순). 화면(상세 미리보기·팀원 리스트)이 이 순서를 그대로 그린다.
const ROLE_ORDER: Record<TeamRole, number> = { LEADER: 0, MEMBER: 1 };

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // 프로필 설정의 소속 팀 선택지 + 팀스토리 목록. 선택지 쪽은 id·name만 읽는다.
  async findAll(): Promise<TeamSummary[]> {
    const teams = await this.prisma.team.findMany({
      select: { id: true, name: true, iconUrl: true, tagline: true },
      orderBy: { name: 'asc' },
    });

    // iconUrl에는 이미지 주소가 아니라 아이콘 이름이 들어간다 (TeamSummary 주석 참고).
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      iconName: team.iconUrl,
      tagline: team.tagline,
    }));
  }

  // 팀스토리 상세와 팀원 리스트가 같이 쓴다. 사진은 갤러리 조회가 따로 내려준다.
  async findOne(id: string): Promise<TeamDetailResponse | null> {
    const team = await this.prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        iconUrl: true,
        tagline: true,
        description: true,
        coverImageUrl: true,
        memberships: {
          where: { endedAt: null },
          select: {
            role: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!team) return null;

    const members = team.memberships
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      }))
      .sort(
        (a, b) =>
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          a.name.localeCompare(b.name, 'ko'),
      );

    return {
      id: team.id,
      name: team.name,
      iconName: team.iconUrl,
      tagline: team.tagline,
      description: team.description,
      coverImageUrl: team.coverImageUrl,
      members,
    };
  }
}
