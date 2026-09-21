import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CellNewsDetail,
  CellNewsListItem,
  PostComment,
  QtShareDetail,
  QtShareListItem,
  QtShareListResponse,
  QtShareMonth,
} from '@onnuri/shared';

import { pad, toDateLabel, toDayLabel } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCellNewsDto } from './dto/create-cell-news.dto';

// "내 좋아요"를 고르는 조건. 게스트(userId 없음)는 좋아요가 있을 수 없는데, Prisma는
// where의 undefined를 "조건 없음"으로 보기 때문에 그냥 넘기면 남의 좋아요까지 딸려와
// likedByMe가 조용히 true가 된다. 빈 문자열은 어떤 cuid와도 안 맞아 0건이 된다.
function myLikeFilter(userId?: string) {
  return { userId: userId ?? '' };
}

// 월 필터는 큐티나눔 목록 전용이라 여기 둔다 (공용 날짜 라벨은 common/utils/date).
function toMonthValue(date: Date): string {
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}`;
}

// "2026.05" → "26년 5월"
function toMonthLabel(monthValue: string): string {
  const [year, month] = monthValue.split('.');
  return `${year.slice(2)}년 ${Number(month)}월`;
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // 큐티나눔 목록. 월 필터 항목도 함께 내려준다 — 앱이 월 목록을 직접 만들지 않게 하려는 것
  // (ARCHITECTURE.md App Responsibilities). 글이 없는 달은 선택지에 넣지 않는다.
  async findQtShares(
    userId: string | undefined,
    month?: string,
  ): Promise<QtShareListResponse> {
    const months = await this.findMonths();
    // 요청한 달에 글이 없으면(또는 month 생략) 가장 최근 달을 보여준다.
    const selected =
      months.find((item) => item.value === month)?.value ?? months[0]?.value;
    if (!selected) return { months, selectedMonth: null, items: [] };

    const [year, monthOfYear] = selected.split('.').map(Number);
    const posts = await this.prisma.post.findMany({
      where: {
        board: 'QT_SHARE',
        deletedAt: null,
        eventDate: {
          gte: new Date(Date.UTC(year, monthOfYear - 1, 1)),
          lt: new Date(Date.UTC(year, monthOfYear, 1)),
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        eventDate: true,
        author: { select: { name: true } },
        _count: { select: { likes: true } },
        // 내 좋아요만 한 건 집어온다 — 행이 있으면 내가 누른 것 (전체를 받아서 세지 않는다).
        likes: { where: myLikeFilter(userId), select: { id: true } },
      },
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    });

    const items: QtShareListItem[] = posts.map((post) => ({
      id: post.id,
      authorName: post.author.name,
      // eventDate는 큐티나눔 작성 시 항상 채운다(글쓰기 API도 같은 계약).
      dateLabel: post.eventDate ? toDateLabel(post.eventDate) : '',
      title: post.title ?? '',
      description: post.content,
      likeCount: post._count.likes,
      likedByMe: post.likes.length > 0,
    }));

    return { months, selectedMonth: selected, items };
  }

  // 큐티나눔 상세. board까지 조건에 넣는다 — 다른 게시판 글 id로 이 경로를 부르면
  // 큐티 전용 필드(passage)가 빈 채로 조용히 200이 나가므로 없는 글로 취급한다.
  async findQtShare(
    id: string,
    userId: string | undefined,
  ): Promise<QtShareDetail> {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'QT_SHARE', deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        eventDate: true,
        coverImageUrl: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, avatarUrl: true } },
        qtShare: { select: { passage: true } },
        // 본문사진. 배경사진(coverImageUrl)과 달리 Image 테이블에 쌓이고 순서가 있다.
        images: {
          where: { kind: 'POST_CONTENT' },
          select: { url: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        _count: { select: { likes: true } },
        // 목록과 같은 방식 — 내 좋아요 행이 있는지만 본다.
        likes: { where: myLikeFilter(userId), select: { id: true } },
      },
    });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    return {
      id: post.id,
      authorName: post.author.name,
      authorAvatarUrl: post.author.avatarUrl,
      dateLabel: post.eventDate ? toDayLabel(post.eventDate) : '',
      createdAt: post.createdAt.toISOString(),
      title: post.title ?? '',
      passage: post.qtShare?.passage ?? null,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      imageUrls: post.images.map((image) => image.url),
      likeCount: post._count.likes,
      likedByMe: post.likes.length > 0,
      isMine: post.authorId === userId,
    };
  }

  // 셀 소식 목록 — 소식 날짜(eventDate) 최신순. 열람은 게스트도 된다 (셀 페이지 열람 범위).
  async findCellNews(cellId: string): Promise<CellNewsListItem[]> {
    const posts = await this.prisma.post.findMany({
      where: { board: 'CELL_NEWS', cellId, deletedAt: null },
      select: { id: true, title: true, eventDate: true, createdAt: true },
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title ?? '',
      dateLabel: post.eventDate ? toDayLabel(post.eventDate) : '',
      createdAt: post.createdAt.toISOString(),
    }));
  }

  // 셀 소식 상세 — 댓글까지 같이 내려준다 (상세 화면이 한 번에 그린다).
  // board 조건을 넣는 이유는 큐티 상세와 같다 (다른 게시판 글 id로 부르면 없는 글 취급).
  async findCellNewsDetail(
    id: string,
    userId: string | undefined,
  ): Promise<CellNewsDetail> {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'CELL_NEWS', deletedAt: null },
      select: {
        id: true,
        cellId: true,
        title: true,
        content: true,
        eventDate: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, avatarUrl: true } },
        images: {
          where: { kind: 'POST_CONTENT' },
          select: { url: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        _count: { select: { likes: true } },
        likes: { where: myLikeFilter(userId), select: { id: true } },
        comments: {
          where: { deletedAt: null },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    return {
      id: post.id,
      // 소식은 항상 셀에 속한다 (작성 시 cellId 필수) — 스키마상 nullable이라 방어만 해둔다.
      cellId: post.cellId ?? '',
      title: post.title ?? '',
      content: post.content,
      dateLabel: post.eventDate ? toDayLabel(post.eventDate) : '',
      createdAt: post.createdAt.toISOString(),
      authorName: post.author.name,
      authorAvatarUrl: post.author.avatarUrl,
      imageUrls: post.images.map((image) => image.url),
      likeCount: post._count.likes,
      likedByMe: post.likes.length > 0,
      isMine: post.authorId === userId,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        authorName: comment.author.name,
        authorAvatarUrl: comment.author.avatarUrl,
        createdAt: comment.createdAt.toISOString(),
        content: comment.content,
      })),
    };
  }

  // 셀 소식 작성 — 그 셀의 셀원(셀장 포함) 또는 관리자만 (2026-08-26 확정, cellDetail.ts
  // canPostToCell과 같은 규칙을 서버가 강제한다).
  async createCellNews(
    userId: string,
    dto: CreateCellNewsDto,
  ): Promise<CellNewsDetail> {
    const cell = await this.prisma.cell.findFirst({
      where: { id: dto.cellId, deletedAt: null },
      select: { id: true },
    });
    if (!cell) throw new NotFoundException('존재하지 않는 셀입니다.');

    await this.assertCanPostToCell(userId, dto.cellId);

    const post = await this.prisma.post.create({
      data: {
        board: 'CELL_NEWS',
        cellId: dto.cellId,
        authorId: userId,
        title: dto.title,
        content: dto.content,
        eventDate: new Date(dto.eventDate),
        // 본문 사진 — takenOn을 소식 날짜로 둬서 갤러리 월 그룹이 소식 날짜를 따라간다
        images: {
          create: (dto.imageUrls ?? []).map((url, index) => ({
            url,
            kind: 'POST_CONTENT' as const,
            uploadedById: userId,
            takenOn: new Date(dto.eventDate),
            sortOrder: index,
          })),
        },
      },
      select: { id: true },
    });
    return this.findCellNewsDetail(post.id, userId);
  }

  // 셀 소식 삭제 (soft) — 작성자 본인, 그 셀의 셀장/부셀장, 관리자만.
  async deleteCellNews(id: string, userId: string): Promise<{ id: string }> {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'CELL_NEWS', deletedAt: null },
      select: { id: true, cellId: true, authorId: true },
    });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    if (post.authorId !== userId) {
      const requester = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          isAdmin: true,
          cellMemberships: {
            where: {
              cellId: post.cellId ?? '',
              endedAt: null,
              role: { in: ['LEADER', 'SUB_LEADER'] },
            },
            select: { id: true },
          },
        },
      });
      const isCellLeader = (requester?.cellMemberships.length ?? 0) > 0;
      if (!requester?.isAdmin && !isCellLeader) {
        throw new ForbiddenException('삭제 권한이 없습니다.');
      }
    }

    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  // 댓글 작성 — 게시판 공용 (Comment 테이블). 로그인한 사용자면 누구나 달 수 있다.
  async addComment(
    postId: string,
    userId: string,
    content: string,
  ): Promise<PostComment> {
    await this.assertPostExists(postId);
    const comment = await this.prisma.comment.create({
      data: { postId, authorId: userId, content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { name: true, avatarUrl: true } },
      },
    });
    return {
      id: comment.id,
      authorName: comment.author.name,
      authorAvatarUrl: comment.author.avatarUrl,
      createdAt: comment.createdAt.toISOString(),
      content: comment.content,
    };
  }

  // 소식 작성 권한: 관리자거나 그 셀의 진행 중 멤버십이 있어야 한다.
  private async assertCanPostToCell(userId: string, cellId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        cellMemberships: {
          where: { cellId, endedAt: null },
          select: { id: true },
        },
      },
    });
    const isCellMember = (user?.cellMemberships.length ?? 0) > 0;
    if (!user?.isAdmin && !isCellMember) {
      throw new ForbiddenException('이 셀의 셀원만 소식을 작성할 수 있습니다.');
    }
  }

  // 좋아요는 게시판과 무관하게 Post에 붙으므로 큐티 전용이 아니다 — 기도제목·부서활동도 이걸 쓴다.
  // 같은 요청이 두 번 와도 결과가 같게 만든다(네트워크 재시도 대비): 이미 누른 상태면 그대로 둔다.
  async like(postId: string, userId: string): Promise<void> {
    await this.assertPostExists(postId);
    await this.prisma.postLike.upsert({
      where: { postId_userId: { postId, userId } },
      update: {},
      create: { postId, userId },
    });
  }

  // 누르지 않은 글의 좋아요를 취소해도 에러로 보지 않는다(위와 같은 이유).
  async unlike(postId: string, userId: string): Promise<void> {
    await this.assertPostExists(postId);
    await this.prisma.postLike.deleteMany({ where: { postId, userId } });
  }

  // 삭제된 글은 없는 것으로 취급한다 — 목록에서 빠진 글에 좋아요가 붙지 않게.
  private async assertPostExists(postId: string): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
  }

  // 월 목록은 전체 글의 날짜에서 뽑아야 해서 본문 없이 날짜만 따로 조회한다.
  private async findMonths(): Promise<QtShareMonth[]> {
    const dates = await this.prisma.post.findMany({
      where: { board: 'QT_SHARE', deletedAt: null, eventDate: { not: null } },
      select: { eventDate: true },
      orderBy: { eventDate: 'desc' },
    });

    const values = [...new Set(dates.map((row) => toMonthValue(row.eventDate!)))];
    return values.map((value) => ({ value, label: toMonthLabel(value) }));
  }
}
