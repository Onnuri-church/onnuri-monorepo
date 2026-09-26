import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  PrayerDetailResponse,
  PrayerListItem,
  PrayerListResponse,
} from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePrayerDto } from './dto/create-prayer.dto';
import { UpdatePrayerDto } from './dto/update-prayer.dto';
import type { FindPrayersDto } from './dto/find-prayers.dto';

// 목록 한 건을 그리는 데 필요한 select — 게시판/내 글/저장한 글이 같이 쓴다.
const LIST_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  authorId: true,
  author: { select: { name: true, avatarUrl: true } },
  prayerRequest: {
    select: {
      number: true,
      category: true,
      isAnonymous: true,
      visibleUntil: true,
    },
  },
} as const;

type ListRow = {
  id: string;
  title: string | null;
  createdAt: Date;
  authorId: string;
  author: { name: string; avatarUrl: string | null };
  prayerRequest: {
    number: number;
    category: PrayerListItem['category'];
    isAnonymous: boolean;
    visibleUntil: Date;
  } | null;
  bookmarks: { id: string }[];
};

// 공개기간 비교 기준일 — visibleUntil은 DATE 컬럼(UTC 자정)이라 now를 그대로 쓰면
// 종료일 당일(D-0)이 빠진다. 오늘 자정으로 맞춘다.
function startOfToday(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

// 내 북마크 조건 — posts.service의 myLikeFilter와 같은 이유 (게스트 undefined 방어).
function myBookmarkFilter(userId?: string) {
  return { userId: userId ?? '' };
}

@Injectable()
export class PrayersService {
  constructor(private readonly prisma: PrismaService) {}

  // 익명 글의 실명 노출 판단 — 관리자에게만 "익명(실명)"으로 조립한다 (확정 스펙).
  private async isAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    return user?.isAdmin ?? false;
  }

  private toItem(
    row: ListRow,
    userId: string | undefined,
    admin: boolean,
  ): PrayerListItem {
    // schema상 board=PRAYER면 prayerRequest가 항상 있다 — 없으면 데이터가 깨진 것.
    const prayer = row.prayerRequest!;
    const realName = row.author.name;
    return {
      id: row.id,
      number: prayer.number,
      authorName: prayer.isAnonymous
        ? admin
          ? `익명(${realName})`
          : '익명'
        : realName,
      category: prayer.category,
      title: row.title ?? '',
      createdAt: row.createdAt.toISOString(),
      // 계약: ISO date (YYYY-MM-DD)
      visibleUntil: prayer.visibleUntil.toISOString().slice(0, 10),
      bookmarked: row.bookmarks.length > 0,
      isMine: userId !== undefined && row.authorId === userId,
    };
  }

  // 게시판 목록 — 공개기간이 지난 글은 숨긴다. totalCount는 필터와 무관한 총계(상단 문구용).
  async findAll(
    userId: string | undefined,
    query: FindPrayersDto,
  ): Promise<PrayerListResponse> {
    const visible = {
      board: 'PRAYER' as const,
      deletedAt: null,
      prayerRequest: { visibleUntil: { gte: startOfToday() } },
    };
    const [admin, totalCount, rows] = await Promise.all([
      this.isAdmin(userId),
      this.prisma.post.count({ where: visible }),
      this.prisma.post.findMany({
        where: {
          ...visible,
          ...(query.category && {
            prayerRequest: {
              visibleUntil: { gte: startOfToday() },
              category: query.category,
            },
          }),
        },
        select: {
          ...LIST_SELECT,
          bookmarks: { where: myBookmarkFilter(userId), select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalCount,
      items: rows.map((row) => this.toItem(row, userId, admin)),
    };
  }

  // 내 기도제목 — 공개기간이 지난 글도 보여준다 (본인이 수정·삭제할 수 있어야 하므로).
  async findMine(
    userId: string,
    query: FindPrayersDto,
  ): Promise<PrayerListItem[]> {
    const rows = await this.prisma.post.findMany({
      where: {
        board: 'PRAYER',
        deletedAt: null,
        authorId: userId,
        ...(query.category && { prayerRequest: { category: query.category } }),
      },
      select: {
        ...LIST_SELECT,
        bookmarks: { where: myBookmarkFilter(userId), select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // 내 글은 익명이어도 실명 노출 문제가 없다 — 그래도 문구는 목록과 같게 유지한다.
    return rows.map((row) => this.toItem(row, userId, false));
  }

  // 저장한 기도제목 — 내가 북마크한 글만.
  async findBookmarked(
    userId: string,
    query: FindPrayersDto,
  ): Promise<PrayerListItem[]> {
    const rows = await this.prisma.post.findMany({
      where: {
        board: 'PRAYER',
        deletedAt: null,
        bookmarks: { some: { userId } },
        ...(query.category && { prayerRequest: { category: query.category } }),
      },
      select: {
        ...LIST_SELECT,
        bookmarks: { where: myBookmarkFilter(userId), select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const admin = await this.isAdmin(userId);
    return rows.map((row) => this.toItem(row, userId, admin));
  }

  // 상세 — 볼 때마다 조회수를 올린다. 공개기간이 지나도 직접 링크(내 글 목록 등)로는 열린다.
  async findOne(
    id: string,
    userId: string | undefined,
  ): Promise<PrayerDetailResponse> {
    const row = await this.prisma.post.findFirst({
      where: { id, board: 'PRAYER', deletedAt: null },
      select: {
        ...LIST_SELECT,
        content: true,
        viewCount: true,
        bookmarks: { where: myBookmarkFilter(userId), select: { id: true } },
        images: {
          where: { kind: 'POST_CONTENT' },
          select: { url: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!row) throw new NotFoundException('기도제목을 찾을 수 없습니다.');

    await this.prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    });

    const admin = await this.isAdmin(userId);
    const anonymous = row.prayerRequest!.isAnonymous;
    return {
      ...this.toItem(row, userId, admin),
      // 익명 글은 사진도 노출하지 않는다 — 이름과 달리 관리자에게도 숨긴다 (사진은 식별력이 세다).
      authorAvatarUrl: anonymous ? null : row.author.avatarUrl,
      content: row.content,
      viewCount: row.viewCount + 1,
      photoUrls: row.images.map((image) => image.url),
      isAnonymous: row.prayerRequest!.isAnonymous,
    };
  }

  async create(
    userId: string,
    dto: CreatePrayerDto,
  ): Promise<PrayerDetailResponse> {
    const post = await this.prisma.post.create({
      data: {
        board: 'PRAYER',
        authorId: userId,
        title: dto.title,
        content: dto.content,
        prayerRequest: {
          create: {
            category: dto.category,
            isAnonymous: dto.isAnonymous,
            visibleUntil: new Date(dto.visibleUntil),
          },
        },
        // 기도제목 사진은 갤러리에 안 실린다 — takenOn은 업로드일 기본 규칙을 따른다.
        images: {
          create: (dto.imageUrls ?? []).map((url, index) => ({
            url,
            kind: 'POST_CONTENT' as const,
            uploadedById: userId,
            takenOn: new Date(),
            sortOrder: index,
          })),
        },
      },
      select: { id: true },
    });
    return this.findOne(post.id, userId);
  }

  // 수정은 작성자만 — 관리자용 게시판 시안도 남의 글에는 삭제만 둔다.
  async update(
    id: string,
    userId: string,
    dto: UpdatePrayerDto,
  ): Promise<PrayerDetailResponse> {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'PRAYER', deletedAt: null },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('기도제목을 찾을 수 없습니다.');
    if (post.authorId !== userId) {
      throw new ForbiddenException('본인 글만 수정할 수 있습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.content !== undefined && { content: dto.content }),
        },
        select: { id: true },
      });
      if (
        dto.category !== undefined ||
        dto.isAnonymous !== undefined ||
        dto.visibleUntil !== undefined
      ) {
        await tx.prayerRequest.update({
          where: { postId: id },
          data: {
            ...(dto.category !== undefined && { category: dto.category }),
            ...(dto.isAnonymous !== undefined && {
              isAnonymous: dto.isAnonymous,
            }),
            ...(dto.visibleUntil !== undefined && {
              visibleUntil: new Date(dto.visibleUntil),
            }),
          },
        });
      }
      // 남길 사진도 목록에 포함해서 보내는 전체 교체 계약 (셀 소식 수정과 동일).
      if (dto.imageUrls !== undefined) {
        await tx.image.deleteMany({
          where: { postId: id, kind: 'POST_CONTENT' },
        });
        await tx.image.createMany({
          data: dto.imageUrls.map((url, index) => ({
            url,
            kind: 'POST_CONTENT' as const,
            postId: id,
            uploadedById: userId,
            takenOn: new Date(),
            sortOrder: index,
          })),
        });
      }
    });
    return this.findOne(id, userId);
  }

  // 삭제는 작성자 또는 관리자 (관리자 확정 스펙: 모든 게시물 삭제 가능) — soft delete.
  async remove(id: string, userId: string): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'PRAYER', deletedAt: null },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('기도제목을 찾을 수 없습니다.');
    if (post.authorId !== userId && !(await this.isAdmin(userId))) {
      throw new ForbiddenException('본인 글만 삭제할 수 있습니다.');
    }
    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  // 북마크 — 이미 눌린 글에 또 눌러도 조용히 성공한다 (좋아요와 같은 계약).
  async bookmark(id: string, userId: string): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'PRAYER', deletedAt: null },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('기도제목을 찾을 수 없습니다.');
    await this.prisma.bookmark.upsert({
      where: { postId_userId: { postId: id, userId } },
      create: { postId: id, userId },
      update: {},
    });
  }

  async unbookmark(id: string, userId: string): Promise<void> {
    await this.prisma.bookmark.deleteMany({ where: { postId: id, userId } });
  }
}
