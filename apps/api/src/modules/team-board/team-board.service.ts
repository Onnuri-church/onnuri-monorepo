import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ChatFile,
  TeamBoardCommentInfo,
  TeamBoardListResponse,
  TeamBoardPostDetail,
  TeamBoardPostInfo,
  TeamBoardReactor,
} from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTeamBoardCommentDto,
  SaveTeamBoardPostDto,
  UpdateTeamBoardCommentDto,
} from './dto/team-board.dto';

const PAGE_SIZE = 20;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const POST_SELECT = {
  id: true,
  teamId: true,
  authorId: true,
  content: true,
  imageUrls: true,
  links: true,
  files: true,
  noticeAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { name: true, avatarUrl: true } },
  reactions: { select: { userId: true, emoji: true } },
  _count: { select: { comments: { where: { deletedAt: null } } } },
} as const;

type PostRow = {
  id: string;
  teamId: string;
  authorId: string;
  content: string;
  imageUrls: string[];
  links: string[];
  files: unknown;
  noticeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string; avatarUrl: string | null };
  reactions: { userId: string; emoji: string }[];
  _count: { comments: number };
};

interface Access {
  isAdmin: boolean;
  isLeader: boolean;
}

// 팀 전용 게시판 — 그 팀 팀원과 관리자만 읽고 쓴다. 수정·삭제는 작성자, 그 팀 팀장, 관리자.
@Injectable()
export class TeamBoardService {
  constructor(private readonly prisma: PrismaService) {}

  async findPosts(
    userId: string,
    teamId: string,
    cursor?: string,
    year?: number,
    month?: number,
  ): Promise<TeamBoardListResponse> {
    const access = await this.assertAccess(userId, teamId);

    // 연·월은 KST 기준이다 — 안 주면 이번 달. 달 경계(KST 1일 0시)를 UTC로 옮겨 createdAt에 건다.
    const kstNow = new Date(Date.now() + KST_OFFSET_MS);
    const selectedYear =
      year && Number.isInteger(year) && year >= 2000 && year <= 2100
        ? year
        : kstNow.getUTCFullYear();
    const selectedMonth =
      month && Number.isInteger(month) && month >= 1 && month <= 12
        ? month
        : kstNow.getUTCMonth() + 1;
    const monthStart = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1) - KST_OFFSET_MS);
    const monthEnd = new Date(Date.UTC(selectedYear, selectedMonth, 1) - KST_OFFSET_MS);

    if (cursor) {
      const exists = await this.prisma.teamBoardPost.findFirst({
        where: { id: cursor, teamId, deletedAt: null },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('잘못된 cursor입니다.');
    }
    const [rows, noticeRows, firstPost] = await Promise.all([
      this.prisma.teamBoardPost.findMany({
        where: {
          teamId,
          deletedAt: null,
          noticeAt: null,
          createdAt: { gte: monthStart, lt: monthEnd },
        },
        select: POST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      // 공지는 달과 상관없이 첫 쪽 맨 위에 모아 보여준다 (최근 공지 순).
      cursor
        ? Promise.resolve([] as PostRow[])
        : this.prisma.teamBoardPost.findMany({
            where: { teamId, deletedAt: null, noticeAt: { not: null } },
            select: POST_SELECT,
            orderBy: { noticeAt: 'desc' },
            take: 10,
          }),
      this.prisma.teamBoardPost.findFirst({
        where: { teamId, deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    // 연도 선택지 — 첫 글이 올라온 해부터 올해까지 (글이 없으면 올해만).
    const currentYear = kstNow.getUTCFullYear();
    const firstYear = firstPost
      ? new Date(firstPost.createdAt.getTime() + KST_OFFSET_MS).getUTCFullYear()
      : currentYear;
    const years: number[] = [];
    for (let y = currentYear; y >= Math.min(firstYear, selectedYear); y -= 1) years.push(y);
    if (!years.includes(selectedYear)) years.push(selectedYear);

    return {
      notices: noticeRows.map((row) => this.toPostInfo(row, userId, access)),
      items: page.map((row) => this.toPostInfo(row, userId, access)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      years,
      selectedYear,
      selectedMonth,
    };
  }

  async findPost(
    userId: string,
    teamId: string,
    postId: string,
  ): Promise<TeamBoardPostDetail> {
    const access = await this.assertAccess(userId, teamId);
    const row = await this.findPostRow(teamId, postId);
    // 상세를 열면 읽음으로 센다 (한 사람은 한 번만).
    await this.prisma.teamBoardRead.upsert({
      where: { postId_userId: { postId, userId } },
      update: {},
      create: { postId, userId },
    });
    const [readCount, reactionRows] = await Promise.all([
      this.prisma.teamBoardRead.count({ where: { postId } }),
      this.prisma.teamBoardReaction.findMany({
        where: { postId },
        select: {
          emoji: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const reactors: TeamBoardReactor[] = reactionRows.map((reaction) => ({
      userId: reaction.user.id,
      name: reaction.user.name,
      avatarUrl: reaction.user.avatarUrl,
      emoji: reaction.emoji,
    }));
    const comments = await this.prisma.teamBoardComment.findMany({
      where: { postId, deletedAt: null },
      select: {
        id: true,
        authorId: true,
        parentId: true,
        content: true,
        createdAt: true,
        author: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const toComment = (comment: (typeof comments)[number]): TeamBoardCommentInfo => {
      const isMine = comment.authorId === userId;
      return {
        id: comment.id,
        authorId: comment.authorId,
        authorName: comment.author.name,
        authorAvatarUrl: comment.author.avatarUrl,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        isMine,
        // 수정은 작성자·관리자, 삭제는 작성자·팀장·관리자
        canEdit: isMine || access.isAdmin,
        canDelete: isMine || access.isLeader || access.isAdmin,
        replies: [],
      };
    };
    const top = comments.filter((comment) => comment.parentId === null).map(toComment);
    const byId = new Map(top.map((comment) => [comment.id, comment]));
    for (const reply of comments.filter((comment) => comment.parentId !== null)) {
      byId.get(reply.parentId as string)?.replies.push(toComment(reply));
    }

    return { ...this.toPostInfo(row, userId, access), comments: top, reactors, readCount };
  }

  async create(
    userId: string,
    teamId: string,
    dto: SaveTeamBoardPostDto,
  ): Promise<TeamBoardPostInfo> {
    const access = await this.assertAccess(userId, teamId);
    const data = this.toPostData(dto);
    if (dto.isNotice && !access.isLeader && !access.isAdmin) {
      throw new ForbiddenException('공지는 팀장·관리자만 등록할 수 있어요.');
    }
    const row = await this.prisma.teamBoardPost.create({
      data: {
        teamId,
        authorId: userId,
        ...data,
        noticeAt: dto.isNotice ? new Date() : null,
      },
      select: POST_SELECT,
    });
    return this.toPostInfo(row, userId, access);
  }

  async update(
    userId: string,
    teamId: string,
    postId: string,
    dto: SaveTeamBoardPostDto,
  ): Promise<TeamBoardPostInfo> {
    const access = await this.assertAccess(userId, teamId);
    const existing = await this.findPostRow(teamId, postId);
    if (existing.authorId !== userId && !access.isLeader && !access.isAdmin) {
      throw new ForbiddenException('내가 쓴 글만 수정할 수 있어요.');
    }
    // 공지 여부는 팀장·관리자만 바꾼다. 일반 작성자가 수정하면 기존 공지 상태를 그대로 둔다.
    const canNotice = access.isLeader || access.isAdmin;
    const noticeChange =
      canNotice && dto.isNotice !== undefined
        ? { noticeAt: dto.isNotice ? (existing.noticeAt ?? new Date()) : null }
        : {};
    const row = await this.prisma.teamBoardPost.update({
      where: { id: postId },
      data: { ...this.toPostData(dto), ...noticeChange },
      select: POST_SELECT,
    });
    return this.toPostInfo(row, userId, access);
  }

  async remove(userId: string, teamId: string, postId: string): Promise<void> {
    const access = await this.assertAccess(userId, teamId);
    const existing = await this.findPostRow(teamId, postId);
    if (existing.authorId !== userId && !access.isLeader && !access.isAdmin) {
      throw new ForbiddenException('내가 쓴 글만 삭제할 수 있어요.');
    }
    await this.prisma.teamBoardPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
  }

  async addComment(
    userId: string,
    teamId: string,
    postId: string,
    dto: CreateTeamBoardCommentDto,
  ): Promise<void> {
    await this.assertAccess(userId, teamId);
    await this.findPostRow(teamId, postId);
    if (dto.parentId) {
      // 대댓글은 1단계까지 — 부모가 같은 글의 최상위 댓글이어야 한다.
      const parent = await this.prisma.teamBoardComment.findFirst({
        where: { id: dto.parentId, postId, deletedAt: null },
        select: { parentId: true },
      });
      if (!parent) throw new BadRequestException('답글을 달 댓글을 찾을 수 없어요.');
      if (parent.parentId) {
        throw new BadRequestException('대댓글에는 답글을 달 수 없어요.');
      }
    }
    await this.prisma.teamBoardComment.create({
      data: {
        postId,
        authorId: userId,
        parentId: dto.parentId ?? null,
        content: dto.content.trim(),
      },
    });
  }

  // 댓글 수정 — 작성자와 관리자.
  async updateComment(
    userId: string,
    teamId: string,
    postId: string,
    commentId: string,
    dto: UpdateTeamBoardCommentDto,
  ): Promise<void> {
    const access = await this.assertAccess(userId, teamId);
    const comment = await this.prisma.teamBoardComment.findFirst({
      where: { id: commentId, postId, deletedAt: null, post: { teamId } },
      select: { authorId: true },
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없어요.');
    if (comment.authorId !== userId && !access.isAdmin) {
      throw new ForbiddenException('내가 쓴 댓글만 수정할 수 있어요.');
    }
    await this.prisma.teamBoardComment.update({
      where: { id: commentId },
      data: { content: dto.content.trim() },
    });
  }

  // 댓글 삭제 — 작성자, 팀장, 관리자 (부모 댓글을 지우면 대댓글도 같이 안 보이게 soft delete).
  async removeComment(
    userId: string,
    teamId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    const access = await this.assertAccess(userId, teamId);
    const comment = await this.prisma.teamBoardComment.findFirst({
      where: { id: commentId, postId, deletedAt: null, post: { teamId } },
      select: { authorId: true },
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없어요.');
    if (comment.authorId !== userId && !access.isLeader && !access.isAdmin) {
      throw new ForbiddenException('내가 쓴 댓글만 삭제할 수 있어요.');
    }
    await this.prisma.teamBoardComment.updateMany({
      where: { OR: [{ id: commentId }, { parentId: commentId }] },
      data: { deletedAt: new Date() },
    });
  }

  // 이모지 반응 토글 — 이미 눌렀으면 취소.
  async toggleReaction(
    userId: string,
    teamId: string,
    postId: string,
    emoji: string,
  ): Promise<TeamBoardPostInfo> {
    const access = await this.assertAccess(userId, teamId);
    await this.findPostRow(teamId, postId);
    const existing = await this.prisma.teamBoardReaction.findUnique({
      where: { postId_userId_emoji: { postId, userId, emoji } },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.teamBoardReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.teamBoardReaction.create({ data: { postId, userId, emoji } });
    }
    const row = await this.findPostRow(teamId, postId);
    return this.toPostInfo(row, userId, access);
  }

  private async findPostRow(teamId: string, postId: string): Promise<PostRow> {
    const row = await this.prisma.teamBoardPost.findFirst({
      where: { id: postId, teamId, deletedAt: null },
      select: POST_SELECT,
    });
    if (!row) throw new NotFoundException('글을 찾을 수 없어요.');
    return row;
  }

  private toPostData(dto: SaveTeamBoardPostDto) {
    const content = dto.content.trim();
    const imageUrls = dto.imageUrls ?? [];
    const links = dto.links ?? [];
    const files = (dto.files ?? []).map((file) => ({
      url: file.url,
      name: file.name,
      size: file.size,
    }));
    if (!content && imageUrls.length + links.length + files.length === 0) {
      throw new BadRequestException('내용이나 첨부 중 하나는 필요합니다.');
    }
    return { content, imageUrls, links, files };
  }

  // 그 팀 팀원이거나 관리자인지 확인한다. isLeader = 그 팀 팀장.
  private async assertAccess(userId: string, teamId: string): Promise<Access> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      select: { id: true },
    });
    if (!team) throw new NotFoundException('존재하지 않는 팀입니다.');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        teamMemberships: {
          where: { teamId, endedAt: null },
          select: { role: true },
        },
      },
    });
    const isAdmin = requester?.isAdmin === true;
    if (!isAdmin && (requester?.teamMemberships.length ?? 0) === 0) {
      throw new ForbiddenException('이 팀의 팀원만 볼 수 있습니다.');
    }
    return {
      isAdmin,
      isLeader: requester?.teamMemberships.some((m) => m.role === 'LEADER') ?? false,
    };
  }

  private toFiles(value: unknown): ChatFile[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      const file = item as Partial<ChatFile> | null;
      return file && typeof file.url === 'string' && typeof file.name === 'string'
        ? [{ url: file.url, name: file.name, size: Number(file.size) || 0 }]
        : [];
    });
  }

  private toPostInfo(row: PostRow, userId: string, access: Access): TeamBoardPostInfo {
    const isMine = row.authorId === userId;
    const counts = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const reaction of row.reactions) {
      const current = counts.get(reaction.emoji) ?? { count: 0, reactedByMe: false };
      counts.set(reaction.emoji, {
        count: current.count + 1,
        reactedByMe: current.reactedByMe || reaction.userId === userId,
      });
    }
    return {
      id: row.id,
      teamId: row.teamId,
      authorId: row.authorId,
      authorName: row.author.name,
      authorAvatarUrl: row.author.avatarUrl,
      content: row.content,
      imageUrls: row.imageUrls,
      links: row.links,
      files: this.toFiles(row.files),
      reactions: [...counts.entries()].map(([emoji, value]) => ({ emoji, ...value })),
      commentCount: row._count.comments,
      isNotice: row.noticeAt !== null,
      createdAt: row.createdAt.toISOString(),
      // 수정한 적이 있는지 — 작성 직후 updatedAt이 createdAt과 거의 같으므로 1초 여유를 둔다.
      editedAt:
        row.updatedAt.getTime() - row.createdAt.getTime() > 1000
          ? row.updatedAt.toISOString()
          : null,
      isMine,
      canEdit: isMine || access.isLeader || access.isAdmin,
      canDelete: isMine || access.isLeader || access.isAdmin,
    };
  }
}
