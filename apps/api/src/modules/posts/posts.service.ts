import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CellNewsDetail,
  CellNewsListItem,
  HomePostsResponse,
  PostComment,
  QtShareDetail,
  QtShareListItem,
  QtShareListResponse,
  QtShareMonth,
  TeamActivityDetail,
  TeamActivityListItem,
  TeamActivityListResponse,
} from '@onnuri/shared';

import {
  toDateLabel,
  toDayLabel,
  toMonthLabel,
  toMonthValue,
} from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCellNewsDto } from './dto/create-cell-news.dto';
import { CreateTeamActivityDto } from './dto/create-team-activity.dto';
import { UpdateCellNewsDto } from './dto/update-cell-news.dto';

// "내 좋아요"를 고르는 조건. 게스트(userId 없음)는 좋아요가 있을 수 없는데, Prisma는
// where의 undefined를 "조건 없음"으로 보기 때문에 그냥 넘기면 남의 좋아요까지 딸려와
// likedByMe가 조용히 true가 된다. 빈 문자열은 어떤 cuid와도 안 맞아 0건이 된다.
function myLikeFilter(userId?: string) {
  return { userId: userId ?? '' };
}

// 팀 이름 → 부서 키. 앱의 departmentColor.ts가 이 키로 칩 색을 고른다. 팀 이름은 관리자가
// 바꿀 수 있는 값이라 색을 이름에 직접 걸지 않고 안정적인 키를 서버가 만들어 내려준다.
// 여기 없는 팀은 키가 빈 문자열이고, 앱이 폴백 색으로 그린다.
const DEPARTMENT_KEY_BY_TEAM_NAME: Record<string, string> = {
  SNS팀: 'sns',
  찬양팀: 'praise',
  방송팀: 'broadcast',
  풋살팀: 'futsal',
  디자인팀: 'design',
  중보기도팀: 'intercession',
  영상팀: 'video',
};

// 홈 섹션별 장수 — 큐티나눔은 시안대로 3건, 부서활동은 가로 스크롤이라 5건.
const HOME_QT_SHARE_COUNT = 3;
const HOME_TEAM_ACTIVITY_COUNT = 5;

// 목록 카드의 본문 미리보기. 카드가 한 줄만 보여주므로 줄바꿈 이후는 버린다.
function toDescription(content: string): string {
  return content.split('\n')[0];
}

// 댓글 한 건을 앱 계약 모양으로 바꾼다. replies는 부르는 쪽이 채운다 — 대댓글은 깊이가
// 1단계까지라 항상 빈 배열이다.
function toPostComment(
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    authorId: string;
    author: { name: string; avatarUrl: string | null };
  },
  userId?: string,
): PostComment {
  return {
    id: comment.id,
    authorName: comment.author.name,
    authorAvatarUrl: comment.author.avatarUrl,
    createdAt: comment.createdAt.toISOString(),
    content: comment.content,
    isMine: comment.authorId === userId,
    replies: [],
  };
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // 홈의 큐티나눔·부서활동 섹션 — 각 게시판 최신 글을 홈 카드에 필요한 필드만 담아 준다.
  // 게시판 목록과 달리 월·팀 필터 없이 전체에서 고르고, 좋아요 같은 내 상태도 없다.
  async findHomePosts(): Promise<HomePostsResponse> {
    const [qtShares, teamActivities] = await Promise.all([
      this.prisma.post.findMany({
        where: { board: 'QT_SHARE', deletedAt: null },
        select: {
          id: true,
          title: true,
          author: { select: { name: true } },
          qtShare: { select: { passage: true } },
        },
        // 큐티나눔 게시판과 같은 순서 — 큐티 날짜가 먼저, 같은 날이면 나중에 쓴 글.
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        take: HOME_QT_SHARE_COUNT,
      }),
      this.prisma.post.findMany({
        where: { board: 'TEAM_ACTIVITY', deletedAt: null },
        select: {
          id: true,
          title: true,
          coverImageUrl: true,
          team: { select: { name: true } },
          // 썸네일은 첫 장만 있으면 된다 — 상세 캐러셀과 같은 순서의 첫 장.
          images: {
            where: { kind: 'POST_CONTENT' },
            select: { url: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            take: 1,
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: HOME_TEAM_ACTIVITY_COUNT,
      }),
    ]);

    return {
      qtShares: qtShares.map((post) => ({
        id: post.id,
        authorName: post.author.name,
        passage: post.qtShare?.passage ?? null,
        title: post.title ?? '',
      })),
      teamActivities: teamActivities.map((post) => ({
        id: post.id,
        teamName: post.team?.name ?? '',
        department: DEPARTMENT_KEY_BY_TEAM_NAME[post.team?.name ?? ''] ?? '',
        title: post.title ?? '',
        // 상세와 같은 우선순위 — 작성 화면에서 올린 사진이 있으면 그걸, 없으면 시드의 상단 이미지.
        thumbnailUrl: post.images[0]?.url ?? post.coverImageUrl,
      })),
    };
  }

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
            authorId: true,
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
      // 소식은 작성 시 eventDate가 필수라 실데이터에선 항상 있다 — 방어만 해둔다.
      eventDate: post.eventDate?.toISOString().slice(0, 10) ?? '',
      createdAt: post.createdAt.toISOString(),
      authorName: post.author.name,
      authorAvatarUrl: post.author.avatarUrl,
      imageUrls: post.images.map((image) => image.url),
      likeCount: post._count.likes,
      likedByMe: post.likes.length > 0,
      isMine: post.authorId === userId,
      // 셀 소식은 대댓글을 쓰지 않아 replies가 항상 빈 배열이다 (부서활동만 1단계로 쓴다).
      comments: post.comments.map((comment) => toPostComment(comment, userId)),
    };
  }

  // 부서활동 목록. 필터 칩에 쓸 팀 목록을 같이 내려준다 — 이 게시판은 게스트도 열람하는데
  // GET /teams는 로그인이 필요해서 앱이 팀 목록을 따로 받을 수 없다 (큐티나눔 월 목록과 같은 방식).
  async findTeamActivities(
    teamId?: string,
  ): Promise<TeamActivityListResponse> {
    // 필터 칩은 id·name만 쓰지만 계약 타입이 GET /teams와 같은 TeamSummary라
    // 아이콘·한 줄 소개도 같은 모양으로 채운다 (TeamsService.findAll과 동일).
    const rows = await this.prisma.team.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, iconUrl: true, tagline: true },
      orderBy: { name: 'asc' },
    });
    // iconUrl에는 이미지 주소가 아니라 아이콘 이름이 들어간다 (TeamSummary 주석 참고).
    const teams = rows.map((team) => ({
      id: team.id,
      name: team.name,
      iconName: team.iconUrl,
      tagline: team.tagline,
    }));
    // 없는 팀(또는 지워진 팀)으로 걸러달라는 요청은 전체로 되돌린다 — 빈 화면이 나오면
    // 글이 없는 건지 팀이 잘못된 건지 앱에서 구분되지 않는다.
    const selectedTeamId = teams.some((team) => team.id === teamId)
      ? (teamId as string)
      : null;

    const posts = await this.prisma.post.findMany({
      where: {
        board: 'TEAM_ACTIVITY',
        deletedAt: null,
        ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
      },
      select: {
        id: true,
        teamId: true,
        title: true,
        content: true,
        eventDate: true,
        createdAt: true,
        viewCount: true,
        team: { select: { name: true } },
        _count: {
          select: {
            likes: true,
            // 카드의 댓글 수는 최상위 댓글만 센다 (시안: 댓글 3줄에 "댓글 2").
            comments: { where: { deletedAt: null, parentId: null } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const items: TeamActivityListItem[] = posts.map((post) => ({
      id: post.id,
      // 부서활동 글은 항상 팀에 속한다 — 스키마상 nullable이라 방어만 해둔다.
      teamId: post.teamId ?? '',
      teamName: post.team?.name ?? '',
      department: DEPARTMENT_KEY_BY_TEAM_NAME[post.team?.name ?? ''] ?? '',
      // 활동 날짜가 없는 글은 작성 시각으로 대신한다 (eventDate는 스키마상 선택값).
      dateLabel: toDateLabel(post.eventDate ?? post.createdAt),
      title: post.title ?? '',
      description: toDescription(post.content),
      createdAt: post.createdAt.toISOString(),
      viewCount: post.viewCount,
      commentCount: post._count.comments,
      likeCount: post._count.likes,
    }));

    return { teams, selectedTeamId, items };
  }

  // 부서활동 상세 — 댓글·대댓글까지 같이 내려준다 (셀 소식 상세와 같은 방식).
  // 여는 순간 조회수가 1 오른다.
  async findTeamActivity(
    id: string,
    userId: string | undefined,
  ): Promise<TeamActivityDetail> {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'TEAM_ACTIVITY', deletedAt: null },
      select: {
        id: true,
        teamId: true,
        title: true,
        content: true,
        eventDate: true,
        coverImageUrl: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, avatarUrl: true } },
        team: { select: { name: true } },
        // 작성 화면에서 올린 사진. 보낸 순서가 곧 캐러셀 순서다.
        images: {
          where: { kind: 'POST_CONTENT' },
          select: { url: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        _count: { select: { likes: true } },
        likes: { where: myLikeFilter(userId), select: { id: true } },
        // 최상위 댓글만 받고 대댓글은 그 안에 담는다 — 깊이가 1단계뿐이라 평탄화해서
        // 앱이 다시 묶는 것보다 이 모양이 화면과 그대로 맞는다.
        comments: {
          where: { deletedAt: null, parentId: null },
          select: {
            id: true,
            content: true,
            createdAt: true,
            authorId: true,
            author: { select: { name: true, avatarUrl: true } },
            replies: {
              where: { deletedAt: null },
              select: {
                id: true,
                content: true,
                createdAt: true,
                authorId: true,
                author: { select: { name: true, avatarUrl: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    // 조회수는 응답을 만든 뒤에 올린다 — 이 요청으로 본 1은 화면에 안 쓰이고(상세에
    // 조회수 표시가 없다) 목록으로 돌아갔을 때 반영된다.
    await this.prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      id: post.id,
      teamId: post.teamId ?? '',
      teamName: post.team?.name ?? '',
      department: DEPARTMENT_KEY_BY_TEAM_NAME[post.team?.name ?? ''] ?? '',
      title: post.title ?? '',
      content: post.content,
      dateLabel: toDayLabel(post.eventDate ?? post.createdAt),
      createdAt: post.createdAt.toISOString(),
      authorName: post.author.name,
      authorAvatarUrl: post.author.avatarUrl,
      coverImageUrl: post.coverImageUrl,
      imageUrls: post.images.map((image) => image.url),
      likeCount: post._count.likes,
      likedByMe: post.likes.length > 0,
      isMine: post.authorId === userId,
      comments: post.comments.map((comment) => ({
        ...toPostComment(comment, userId),
        replies: comment.replies.map((reply) => toPostComment(reply, userId)),
      })),
    };
  }

  // 부서활동 작성 — 그 팀의 팀원 또는 관리자만 (셀 소식이 "그 셀 셀원만"인 것과 같은 기준,
  // README의 "부서 전용 게시판 권한 관리"). 사진은 파일이 아니라 POST /uploads가 돌려준
  // 주소로 받는다. 저장한 글을 상세 모양 그대로 돌려줘서 앱이 등록 직후 다시 받지 않아도 된다.
  async createTeamActivity(
    userId: string,
    dto: CreateTeamActivityDto,
  ): Promise<TeamActivityDetail> {
    const team = await this.prisma.team.findFirst({
      where: { id: dto.teamId, deletedAt: null },
      select: { id: true },
    });
    if (!team) throw new NotFoundException('존재하지 않는 부서입니다.');

    await this.assertCanPostToTeam(userId, dto.teamId);

    const post = await this.prisma.post.create({
      data: {
        board: 'TEAM_ACTIVITY',
        teamId: dto.teamId,
        authorId: userId,
        title: dto.title,
        content: dto.content,
        eventDate: new Date(dto.eventDate),
        // 보낸 순서가 곧 상세 캐러셀 순서다.
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

    return this.findTeamActivity(post.id, userId);
  }

  // 작성 권한: 관리자거나 그 팀의 진행 중 멤버십이 있어야 한다 (assertCanPostToCell과 같은 모양).
  private async assertCanPostToTeam(userId: string, teamId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAdmin: true,
        teamMemberships: {
          where: { teamId, endedAt: null },
          select: { id: true },
        },
      },
    });
    const isTeamMember = (user?.teamMemberships.length ?? 0) > 0;
    if (!user?.isAdmin && !isTeamMember) {
      throw new ForbiddenException('이 부서의 팀원만 글을 쓸 수 있습니다.');
    }
  }

  // 부서활동 삭제 — 내 글만. 글은 지우지 않고 deletedAt만 채운다(목록·상세가 걸러낸다).
  async removeTeamActivity(id: string, userId: string): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'TEAM_ACTIVITY', deletedAt: null },
      select: { authorId: true },
    });
    // 없는 글과 남의 글을 구분한다 — 남의 글에 404를 주면 앱에서 "글이 사라졌다"로 보여
    // 잘못된 안내가 나간다 (큐티나눔과 같은 기준).
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.authorId !== userId) {
      throw new ForbiddenException('내가 쓴 글만 삭제할 수 있습니다.');
    }

    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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

  // 셀 소식 수정 — 권한은 삭제와 동일(작성자·셀장/부셀장·관리자). imageUrls를 보내면
  // 본문 사진을 통째로 교체한다 (남길 사진도 목록에 포함해서 보내는 계약).
  async updateCellNews(
    id: string,
    userId: string,
    dto: UpdateCellNewsDto,
  ): Promise<CellNewsDetail> {
    const post = await this.findEditableCellNews(id, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.eventDate !== undefined && {
            eventDate: new Date(dto.eventDate),
          }),
        },
      });
      if (dto.imageUrls !== undefined) {
        await tx.image.deleteMany({ where: { postId: id, kind: 'POST_CONTENT' } });
        const takenOn = new Date(dto.eventDate ?? post.eventDate ?? new Date());
        await tx.image.createMany({
          data: dto.imageUrls.map((url, index) => ({
            url,
            kind: 'POST_CONTENT' as const,
            postId: id,
            uploadedById: userId,
            takenOn,
            sortOrder: index,
          })),
        });
      }
    });

    return this.findCellNewsDetail(id, userId);
  }

  // 셀 소식 삭제 (soft) — 작성자 본인, 그 셀의 셀장/부셀장, 관리자만.
  async deleteCellNews(id: string, userId: string): Promise<{ id: string }> {
    await this.findEditableCellNews(id, userId);
    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  // 수정·삭제 공통 권한: 작성자 본인, 그 셀의 셀장/부셀장, 관리자.
  private async findEditableCellNews(id: string, userId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, board: 'CELL_NEWS', deletedAt: null },
      select: { id: true, cellId: true, authorId: true, eventDate: true },
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
        throw new ForbiddenException('수정·삭제 권한이 없습니다.');
      }
    }
    return post;
  }

  // 댓글 작성 — 게시판 공용 (Comment 테이블). 로그인한 사용자면 누구나 달 수 있다.
  // parentId를 주면 그 댓글의 대댓글이 된다.
  async addComment(
    postId: string,
    userId: string,
    content: string,
    parentId?: string,
  ): Promise<PostComment> {
    await this.assertPostExists(postId);
    if (parentId) await this.assertCanReplyTo(parentId, postId);

    const comment = await this.prisma.comment.create({
      data: { postId, authorId: userId, content, parentId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, avatarUrl: true } },
      },
    });
    return toPostComment(comment, userId);
  }

  // 댓글 삭제 — 내 댓글만. 글처럼 soft delete다 (대댓글이 달려 있으면 행을 지울 수 없다).
  async removeComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { authorId: true },
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('내가 쓴 댓글만 삭제할 수 있습니다.');
    }
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }

  // 대댓글은 1단계까지만 (스키마 주석의 "1단계 깊이만 (앱 검증)"을 서버가 강제한다).
  // 부모가 다른 글의 댓글이면 남의 글 댓글에 답글이 붙으므로 같이 막는다.
  private async assertCanReplyTo(
    parentId: string,
    postId: string,
  ): Promise<void> {
    const parent = await this.prisma.comment.findFirst({
      where: { id: parentId, deletedAt: null },
      select: { postId: true, parentId: true },
    });
    if (!parent || parent.postId !== postId) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }
    if (parent.parentId) {
      throw new BadRequestException('대댓글에는 답글을 달 수 없습니다.');
    }
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
