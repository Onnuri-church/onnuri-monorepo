import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { HomeBanner } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';

type BannerRow = {
  id: string;
  title: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: Date;
};

const BANNER_SELECT = {
  id: true,
  title: true,
  content: true,
  imageUrl: true,
  createdAt: true,
} as const;

// "9월 설교 시리즈" — 등록 시각의 KST 월. 서버(UTC)의 월을 그대로 쓰면 월초 밤에 한 달 밀린다.
function toSeriesLabel(createdAt: Date): string {
  const kst = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}월 설교 시리즈`;
}

// 홈 배너 — Notice(type=BANNER)를 쓴다 (erd.md 설계 그대로).
// 활성 배너 = 가장 최근 등록 1건, 내리기 = 삭제. 수련회 포스터를 지우면 그 전
// 배너(설교)가 자동으로 다시 표시되는 스택 구조라 별도 활성 플래그가 없다.
@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  private toBanner(row: BannerRow): HomeBanner {
    // 유형 판별은 구절(content) 유무 — 말씀 배너도 배경사진을 가질 수 있어 이미지로는 못 가른다.
    const kind = row.content !== null ? 'SERMON' : 'POSTER';
    return {
      id: row.id,
      kind,
      title: row.title,
      passage: row.content,
      seriesLabel: kind === 'SERMON' ? toSeriesLabel(row.createdAt) : null,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // 홈이 그리는 현재 배너. 등록된 게 없으면 null — 앱이 기본 문구로 폴백한다.
  async findActiveBanner(): Promise<HomeBanner | null> {
    const row = await this.prisma.notice.findFirst({
      where: { type: 'BANNER' },
      select: BANNER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toBanner(row) : null;
  }

  // 배너 관리 목록 (관리자) — 최신순. 첫 항목이 지금 홈에 표시 중인 배너다.
  async findBanners(): Promise<HomeBanner[]> {
    const rows = await this.prisma.notice.findMany({
      where: { type: 'BANNER' },
      select: BANNER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toBanner(row));
  }

  async createBanner(adminId: string, dto: CreateBannerDto): Promise<HomeBanner> {
    if (!dto.imageUrl && !dto.passage) {
      throw new BadRequestException(
        '성경 구절(말씀 배너) 또는 포스터 이미지 중 하나는 필요합니다.',
      );
    }
    const row = await this.prisma.notice.create({
      data: {
        type: 'BANNER',
        title: dto.title,
        // 말씀 배너의 구절은 content 컬럼에 담는다 — Notice에 전용 컬럼이 없어서다.
        // 이미지는 두 유형 다 가질 수 있다 (말씀 배너의 배경사진 / 포스터).
        content: dto.passage ?? null,
        imageUrl: dto.imageUrl ?? null,
        authorId: adminId,
      },
      select: BANNER_SELECT,
    });
    return this.toBanner(row);
  }

  // 내리기 — 배너는 지나간 이벤트라 기록 가치가 없어 hard delete.
  async removeBanner(id: string): Promise<void> {
    const row = await this.prisma.notice.findFirst({
      where: { id, type: 'BANNER' },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('배너를 찾을 수 없습니다.');
    await this.prisma.notice.delete({ where: { id } });
  }
}
