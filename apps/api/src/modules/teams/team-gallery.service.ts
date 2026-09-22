import { Injectable, NotFoundException } from '@nestjs/common';
import type { TeamGalleryMonth } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

// 팀 갤러리 — 직접 업로드(Image.kind=GALLERY) + 그 팀 부서활동 글의 본문 사진(POST_CONTENT)
// 자동 포함 (2026-09-04 확정, docs/erd.md). 다른 팀 글의 사진은 섞이지 않는다.
// 월 그룹 기준은 takenOn(게시글 사진은 활동 날짜, 직접 업로드는 업로드일 — 스키마 주석).
@Injectable()
export class TeamGalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(teamId: string): Promise<TeamGalleryMonth[]> {
    await this.assertTeamExists(teamId);
    const images = await this.prisma.image.findMany({
      where: {
        OR: [
          { teamId, kind: 'GALLERY' },
          { kind: 'POST_CONTENT', post: { teamId, deletedAt: null } },
        ],
      },
      select: { id: true, url: true, kind: true, takenOn: true, createdAt: true },
      orderBy: [{ takenOn: 'desc' }, { createdAt: 'desc' }],
    });

    // 최신 달부터, 달 안에서도 최신 사진부터 (조회 정렬 그대로 밀어 넣는다).
    const months: TeamGalleryMonth[] = [];
    for (const image of images) {
      const date = image.takenOn ?? image.createdAt;
      const label = `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월`;
      let section = months.find((item) => item.month === label);
      if (!section) {
        section = { month: label, photos: [] };
        months.push(section);
      }
      section.photos.push({
        id: image.id,
        url: image.url,
        deletable: image.kind === 'GALLERY',
      });
    }
    return months;
  }

  private async assertTeamExists(teamId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
  }
}
