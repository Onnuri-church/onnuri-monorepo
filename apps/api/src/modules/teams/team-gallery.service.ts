import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  // 업로드 — 그 팀의 팀장·관리자만 (docs/attendance-data-model.md §1 "팀장: 활동 사진 추가").
  // 셀과 달리 팀원 전원에게 열지 않는다 — 문서에 팀장만 적혀 있어 좁은 쪽으로 맞췄다.
  async add(
    userId: string,
    teamId: string,
    url: string,
  ): Promise<TeamGalleryMonth[]> {
    await this.assertTeamExists(teamId);
    await this.assertCanManage(userId, teamId);
    await this.prisma.image.create({
      data: {
        url,
        kind: 'GALLERY',
        teamId,
        uploadedById: userId,
        takenOn: new Date(),
      },
    });
    return this.findAll(teamId);
  }

  // 선택 삭제 — 직접 업로드(GALLERY)만 지운다: 게시글 사진을 여기서 지우면 글 본문과
  // 어긋나므로 글 삭제를 통해서만 빠진다 (셀 갤러리와 같은 규칙).
  async remove(
    userId: string,
    teamId: string,
    imageIds: string[],
  ): Promise<TeamGalleryMonth[]> {
    await this.assertTeamExists(teamId);
    await this.assertCanManage(userId, teamId);
    await this.prisma.image.deleteMany({
      where: { id: { in: imageIds }, teamId, kind: 'GALLERY' },
    });
    return this.findAll(teamId);
  }

  private async assertCanManage(userId: string, teamId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        teamMemberships: {
          where: { teamId, endedAt: null, role: 'LEADER' },
          select: { id: true },
        },
      },
    });
    if (!user?.isAdmin && (user?.teamMemberships.length ?? 0) === 0) {
      throw new ForbiddenException('팀장 또는 관리자만 사진을 관리할 수 있습니다.');
    }
  }

  private async assertTeamExists(teamId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });
    if (!team) throw new NotFoundException('팀을 찾을 수 없습니다.');
  }
}
