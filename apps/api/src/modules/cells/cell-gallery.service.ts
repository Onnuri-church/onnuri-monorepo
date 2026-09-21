import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CellGalleryMonth } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

// 셀 갤러리 — 직접 업로드(Image.kind=GALLERY) + 그 셀 게시글의 본문 사진(POST_CONTENT)
// 자동 포함 (2026-09-04 확정). 월 그룹 기준은 takenOn(게시글 사진은 소식 날짜, 직접
// 업로드는 업로드일 — 스키마 주석).
@Injectable()
export class CellGalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(cellId: string): Promise<CellGalleryMonth[]> {
    await this.assertCellExists(cellId);
    const images = await this.prisma.image.findMany({
      where: {
        OR: [
          { cellId, kind: 'GALLERY' },
          { kind: 'POST_CONTENT', post: { cellId, deletedAt: null } },
        ],
      },
      select: { id: true, url: true, kind: true, takenOn: true, createdAt: true },
      orderBy: [{ takenOn: 'desc' }, { createdAt: 'desc' }],
    });

    // 최신 달부터, 달 안에서도 최신 사진부터 (조회 정렬 그대로 밀어 넣는다).
    const months: CellGalleryMonth[] = [];
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

  // 업로드 — 그 셀의 셀원(셀장 포함) 또는 관리자 (소식 작성과 같은 canPost 규칙).
  async add(
    userId: string,
    cellId: string,
    url: string,
  ): Promise<CellGalleryMonth[]> {
    await this.assertCellExists(cellId);
    await this.assertCanPost(userId, cellId);
    await this.prisma.image.create({
      data: {
        url,
        kind: 'GALLERY',
        cellId,
        uploadedById: userId,
        takenOn: new Date(),
      },
    });
    return this.findAll(cellId);
  }

  // 선택 삭제 — 셀장/부셀장·관리자만. 직접 업로드(GALLERY)만 지운다: 게시글 사진을
  // 여기서 지우면 소식 본문과 어긋나므로 글 삭제를 통해서만 빠진다.
  async remove(
    userId: string,
    cellId: string,
    imageIds: string[],
  ): Promise<CellGalleryMonth[]> {
    await this.assertCellExists(cellId);
    await this.assertCanManage(userId, cellId);
    await this.prisma.image.deleteMany({
      where: { id: { in: imageIds }, cellId, kind: 'GALLERY' },
    });
    return this.findAll(cellId);
  }

  private async assertCellExists(cellId: string) {
    const cell = await this.prisma.cell.findFirst({
      where: { id: cellId, deletedAt: null },
      select: { id: true },
    });
    if (!cell) throw new NotFoundException('존재하지 않는 셀입니다.');
  }

  private async assertCanPost(userId: string, cellId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        cellMemberships: { where: { cellId, endedAt: null }, select: { id: true } },
      },
    });
    if (!user?.isAdmin && (user?.cellMemberships.length ?? 0) === 0) {
      throw new ForbiddenException('이 셀의 셀원만 사진을 올릴 수 있습니다.');
    }
  }

  private async assertCanManage(userId: string, cellId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        cellMemberships: {
          where: { cellId, endedAt: null, role: { in: ['LEADER', 'SUB_LEADER'] } },
          select: { id: true },
        },
      },
    });
    if (!user?.isAdmin && (user?.cellMemberships.length ?? 0) === 0) {
      throw new ForbiddenException('셀장 또는 관리자만 사진을 지울 수 있습니다.');
    }
  }
}
