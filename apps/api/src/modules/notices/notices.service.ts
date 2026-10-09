import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { HomeBanner, NoticeInfo } from '@onnuri/shared';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

type BannerRow = {
  id: string;
  title: string;
  content: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
};

const BANNER_SELECT = {
  id: true,
  title: true,
  content: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
} as const;

// "9월 설교 시리즈" — 등록 시각의 KST 월. 서버(UTC)의 월을 그대로 쓰면 월초 밤에 한 달 밀린다.
function toSeriesLabel(createdAt: Date): string {
  const kst = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}월 설교 시리즈`;
}

// 홈 배너 — Notice(type=BANNER)를 쓴다 (erd.md 설계 그대로).
// 홈에 표시되는 배너 = isActive가 켜진 1건 (한 번에 하나만). 새로 등록하면 그 배너가 켜지고
// 나머지는 꺼진다. 켠 게 없으면(전부 끄거나 켜진 배너를 삭제) 앱이 기본 배너로 폴백한다.
@Injectable()
export class NoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private toBanner(row: BannerRow): HomeBanner {
    return {
      id: row.id,
      title: row.title,
      passage: row.content,
      seriesLabel: toSeriesLabel(row.createdAt),
      imageUrl: row.imageUrl,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // 홈이 그리는 현재 배너. 켜진 게 없으면 null — 앱이 기본 문구로 폴백한다.
  async findActiveBanner(): Promise<HomeBanner | null> {
    const row = await this.prisma.notice.findFirst({
      where: { type: 'BANNER', isActive: true },
      select: BANNER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toBanner(row) : null;
  }

  // 배너 관리 목록 (관리자) — 최신순. isActive가 켜진 항목이 지금 홈에 표시 중인 배너다.
  async findBanners(): Promise<HomeBanner[]> {
    const rows = await this.prisma.notice.findMany({
      where: { type: 'BANNER' },
      select: BANNER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toBanner(row));
  }

  async createBanner(adminId: string, dto: CreateBannerDto): Promise<HomeBanner> {
    // 새 배너는 등록 즉시 홈에 표시된다 — 기존에 켜진 배너는 같은 트랜잭션에서 끈다.
    const [, row] = await this.prisma.$transaction([
      this.prisma.notice.updateMany({
        where: { type: 'BANNER', isActive: true },
        data: { isActive: false },
      }),
      this.prisma.notice.create({
        data: {
          type: 'BANNER',
          title: dto.title,
          // 말씀 배너의 구절은 content 컬럼에 담는다 — Notice에 전용 컬럼이 없어서다.
          // 이미지는 두 유형 다 가질 수 있다 (말씀 배너의 배경사진 / 포스터).
          content: dto.passage,
          imageUrl: dto.imageUrl ?? null,
          authorId: adminId,
          isActive: true,
        },
        select: BANNER_SELECT,
      }),
    ]);
    return this.toBanner(row);
  }

  // 홈 표시 켜기/끄기 — 켜면 다른 배너는 모두 꺼진다 (한 번에 하나만).
  async setBannerActive(id: string, active: boolean): Promise<HomeBanner> {
    const exists = await this.prisma.notice.findFirst({
      where: { id, type: 'BANNER' },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('배너를 찾을 수 없습니다.');

    const [, row] = await this.prisma.$transaction([
      this.prisma.notice.updateMany({
        where: { type: 'BANNER', isActive: true, id: { not: id } },
        data: { isActive: false },
      }),
      this.prisma.notice.update({
        where: { id },
        data: { isActive: active },
        select: BANNER_SELECT,
      }),
    ]);
    return this.toBanner(row);
  }

  // 수정 — 보낸 필드만 바꾼다. createdAt이 안 바뀌어서
  // 목록 순서(= 홈 표시 배너)도 그대로다.
  async updateBanner(id: string, dto: UpdateBannerDto): Promise<HomeBanner> {
    const row = await this.prisma.notice.findFirst({
      where: { id, type: 'BANNER' },
      select: BANNER_SELECT,
    });
    if (!row) throw new NotFoundException('배너를 찾을 수 없습니다.');

    const updated = await this.prisma.notice.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.passage !== undefined && { content: dto.passage }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
      select: BANNER_SELECT,
    });
    return this.toBanner(updated);
  }

  // ── 공지사항 (type=NOTICE) — 마이페이지 공지사항 메뉴 ──────────────────────

  private toNotice(row: BannerRow): NoticeInfo {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // 공지 목록 — 최신순. 게스트도 볼 수 있다 (게스트 열람 범위 확정).
  async findNotices(): Promise<NoticeInfo[]> {
    const rows = await this.prisma.notice.findMany({
      where: { type: 'NOTICE' },
      select: BANNER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toNotice(row));
  }

  async createNotice(adminId: string, dto: CreateNoticeDto): Promise<NoticeInfo> {
    if (!dto.content && !dto.imageUrl) {
      throw new BadRequestException('내용이나 이미지 중 하나는 필요합니다.');
    }
    const row = await this.prisma.notice.create({
      data: {
        type: 'NOTICE',
        title: dto.title,
        content: dto.content ?? null,
        imageUrl: dto.imageUrl ?? null,
        authorId: adminId,
      },
      select: BANNER_SELECT,
    });

    // 전 회원 알림 — 작성한 관리자 본인은 제외. 탈퇴자에게는 쌓지 않는다.
    const users = await this.prisma.user.findMany({
      where: { id: { not: adminId }, withdrawnAt: null },
      select: { id: true },
    });
    await this.notifications.notify(
      users.map((user) => user.id),
      {
        type: 'NOTICE',
        title: '공지사항',
        body: `새 공지가 등록됐어요: ${row.title}`,
        linkUrl: `notice/${row.id}`,
      },
    );

    return this.toNotice(row);
  }

  // 공지 삭제 — 배너와 같은 이유로 hard delete (기록 가치가 없는 안내문).
  async removeNotice(id: string): Promise<void> {
    const row = await this.prisma.notice.findFirst({
      where: { id, type: 'NOTICE' },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('공지를 찾을 수 없습니다.');
    await this.prisma.notice.delete({ where: { id } });
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
