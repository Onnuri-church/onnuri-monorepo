import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GroupMeeting, GroupMeetingDetail } from '@onnuri/shared';

import { pad } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupMeetingDto } from './dto/create-group-meeting.dto';
import { UpdateGroupMeetingDto } from './dto/update-group-meeting.dto';

// "7/1 ~ 7/28" — 모집 기간 표시 (시안 카드·상세). @db.Date라 UTC 기준으로 읽는다.
function toPeriodLabel(start: Date | null, end: Date | null): string {
  const part = (date: Date) => `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  if (!start && !end) return '';
  return `${start ? part(start) : ''} ~ ${end ? part(end) : ''}`.trim();
}

// 취향 소그룹 (HobbyGroup = Post 1:1 확장). 참여는 승인제 — 신청(PENDING)을 소그룹장/관리자가
// 승인·거절한다 (2026-09-08 확정). 소그룹장은 생성 폼에서 한 명 이상 지정 (2026-09-21 확정).
@Injectable()
export class GroupMeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<GroupMeeting[]> {
    const groups = await this.prisma.hobbyGroup.findMany({
      where: { post: { deletedAt: null } },
      select: {
        postId: true,
        status: true,
        recruitEnd: true,
        post: { select: { title: true, coverImageUrl: true, createdAt: true } },
        members: {
          where: { status: 'APPROVED' },
          select: { user: { select: { avatarUrl: true } } },
        },
      },
      orderBy: { post: { createdAt: 'desc' } },
    });

    return groups.map((group) => {
      const status = this.toStatus(group);
      return {
        id: group.postId,
        title: group.post.title ?? '',
        deadline: group.recruitEnd?.toISOString().slice(0, 10) ?? null,
        status,
        // 사용자에게 보이는 상태 문구는 프론트가 아니라 여기서 계산한다 (ARCHITECTURE.md App Responsibilities).
        statusLabel: status === 'open' ? '모집중' : '마감',
        thumbnailUrl: group.post.coverImageUrl,
        participantCount: group.members.length,
        participantAvatarUrls: group.members
          .map((member) => member.user.avatarUrl)
          .filter((url): url is string => url !== null)
          .slice(0, 3),
      };
    });
  }

  async findOne(
    id: string,
    userId: string | undefined,
  ): Promise<GroupMeetingDetail> {
    const group = await this.prisma.hobbyGroup.findFirst({
      where: { postId: id, post: { deletedAt: null } },
      select: {
        postId: true,
        status: true,
        recruitStart: true,
        recruitEnd: true,
        meetingSchedule: true,
        place: true,
        cost: true,
        post: {
          select: {
            title: true,
            content: true,
            coverImageUrl: true,
            images: {
              where: { kind: 'POST_CONTENT' },
              select: { id: true, url: true },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
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
        },
        members: {
          select: {
            userId: true,
            role: true,
            status: true,
            user: { select: { name: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!group) throw new NotFoundException('모임을 찾을 수 없습니다.');

    const approved = group.members.filter((m) => m.status === 'APPROVED');
    const leaders = group.members.filter((m) => m.role === 'LEADER');
    const mine = userId
      ? (group.members.find((m) => m.userId === userId) ?? null)
      : null;
    const isAdmin = userId
      ? ((
          await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isAdmin: true },
          })
        )?.isAdmin ?? false)
      : false;
    const canManage = isAdmin || mine?.role === 'LEADER';
    const status = this.toStatus(group);

    return {
      id: group.postId,
      title: group.post.title ?? '',
      deadline: group.recruitEnd?.toISOString().slice(0, 10) ?? null,
      status,
      statusLabel: status === 'open' ? '모집중' : '마감',
      thumbnailUrl: group.post.coverImageUrl,
      participantCount: approved.length,
      participantAvatarUrls: approved
        .map((member) => member.user.avatarUrl)
        .filter((url): url is string => url !== null)
        .slice(0, 3),
      description: group.post.content,
      recruitStart: group.recruitStart?.toISOString().slice(0, 10) ?? null,
      periodLabel: toPeriodLabel(group.recruitStart, group.recruitEnd),
      heroImageUrl: group.post.coverImageUrl,
      schedule: group.meetingSchedule ?? '미정',
      place: group.place ?? '미정',
      cost: group.cost ?? '미정',
      leaders: leaders.map((m) => ({ id: m.userId, name: m.user.name })),
      // Image 테이블에 캡션 컬럼이 없어 표시용 caption은 항상 null이다 (계약은 옛 시안 흔적).
      photos: group.post.images.map((image) => ({
        id: image.id,
        url: image.url,
        caption: null,
      })),
      photoCount: group.post.images.length,
      comments: group.post.comments.map((comment) => ({
        id: comment.id,
        authorName: comment.author.name,
        authorAvatarUrl: comment.author.avatarUrl,
        createdAt: comment.createdAt.toISOString(),
        content: comment.content,
      })),
      myStatus: mine?.status ?? null,
      canManage,
      pendingMembers: canManage
        ? group.members
            .filter((m) => m.status === 'PENDING')
            .map((m) => ({ id: m.userId, name: m.user.name }))
        : [],
    };
  }

  // 생성 (관리자 전용 — 2026-09-21 관리자 시안의 생성 폼). 소그룹장들은 자동 승인 상태다.
  async create(
    adminId: string,
    dto: CreateGroupMeetingDto,
  ): Promise<GroupMeetingDetail> {
    const leaderIds = [...new Set(dto.leaderIds)];
    const leaders = await this.prisma.user.findMany({
      where: { id: { in: leaderIds }, withdrawnAt: null },
      select: { id: true },
    });
    if (leaders.length !== leaderIds.length) {
      throw new BadRequestException('존재하지 않는 회원이 소그룹장에 있습니다.');
    }

    const post = await this.prisma.post.create({
      data: {
        board: 'HOBBY_GROUP',
        authorId: adminId,
        title: dto.title,
        content: dto.description,
        hobbyGroup: {
          create: {
            recruitStart: new Date(dto.recruitStart),
            recruitEnd: new Date(dto.recruitEnd),
            place: dto.place,
            cost: dto.cost,
            members: {
              create: leaderIds.map((userId) => ({
                userId,
                role: 'LEADER' as const,
                status: 'APPROVED' as const,
              })),
            },
          },
        },
      },
      select: { id: true },
    });
    return this.findOne(post.id, adminId);
  }

  // 수정 — 관리자 또는 이 소그룹의 소그룹장. leaderIds는 전체 교체이며 빠진 기존
  // 소그룹장은 일반 참여자(MEMBER·APPROVED 유지)로 남는다.
  async update(
    requesterId: string,
    id: string,
    dto: UpdateGroupMeetingDto,
  ): Promise<GroupMeetingDetail> {
    await this.assertCanManage(requesterId, id);

    await this.prisma.$transaction(async (tx) => {
      if (dto.title !== undefined || dto.description !== undefined) {
        await tx.post.update({
          where: { id },
          data: {
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && { content: dto.description }),
          },
        });
      }
      await tx.hobbyGroup.update({
        where: { postId: id },
        data: {
          ...(dto.recruitStart !== undefined && {
            recruitStart: new Date(dto.recruitStart),
          }),
          ...(dto.recruitEnd !== undefined && {
            recruitEnd: new Date(dto.recruitEnd),
          }),
          ...(dto.place !== undefined && { place: dto.place }),
          ...(dto.cost !== undefined && { cost: dto.cost }),
          ...(dto.status !== undefined && {
            status: dto.status === 'open' ? 'RECRUITING' : 'CLOSED',
          }),
        },
      });

      if (dto.leaderIds !== undefined) {
        const leaderIds = [...new Set(dto.leaderIds)];
        await tx.hobbyGroupMember.updateMany({
          where: { postId: id, role: 'LEADER', userId: { notIn: leaderIds } },
          data: { role: 'MEMBER' },
        });
        for (const userId of leaderIds) {
          await tx.hobbyGroupMember.upsert({
            where: { postId_userId: { postId: id, userId } },
            update: { role: 'LEADER', status: 'APPROVED' },
            create: { postId: id, userId, role: 'LEADER', status: 'APPROVED' },
          });
        }
      }
    });

    return this.findOne(id, requesterId);
  }

  // 삭제 — 관리자 또는 소그룹장. 시안 확정 문구("게시글과 참여 기록이 모두 삭제되며 복구할 수
  // 없습니다")대로 hard delete: Post를 지우면 HobbyGroup·참여·댓글·좋아요가 cascade로 지워진다.
  async remove(requesterId: string, id: string): Promise<{ id: string }> {
    await this.assertCanManage(requesterId, id);
    await this.prisma.post.delete({ where: { id } });
    return { id };
  }

  // 참여 신청 — 모집중일 때만. 거절됐던 사람은 다시 신청하면 PENDING으로 돌아간다.
  async join(userId: string, id: string): Promise<GroupMeetingDetail> {
    const group = await this.prisma.hobbyGroup.findFirst({
      where: { postId: id, post: { deletedAt: null } },
      select: { status: true, recruitEnd: true },
    });
    if (!group) throw new NotFoundException('모임을 찾을 수 없습니다.');
    if (this.toStatus(group) === 'closed') {
      throw new BadRequestException('모집이 마감된 소그룹이에요.');
    }

    const existing = await this.prisma.hobbyGroupMember.findUnique({
      where: { postId_userId: { postId: id, userId } },
      select: { status: true },
    });
    if (existing && existing.status !== 'REJECTED') {
      throw new BadRequestException(
        existing.status === 'PENDING' ? '이미 신청한 소그룹이에요.' : '이미 참여 중인 소그룹이에요.',
      );
    }

    await this.prisma.hobbyGroupMember.upsert({
      where: { postId_userId: { postId: id, userId } },
      update: { status: 'PENDING' },
      create: { postId: id, userId },
    });
    return this.findOne(id, userId);
  }

  // 신청 취소(PENDING) / 탈퇴(APPROVED) — 행 삭제. 소그룹장은 이 경로로 못 나간다 (편집에서 교체).
  async cancelJoin(userId: string, id: string): Promise<GroupMeetingDetail> {
    const membership = await this.prisma.hobbyGroupMember.findUnique({
      where: { postId_userId: { postId: id, userId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('신청 내역이 없어요.');
    if (membership.role === 'LEADER') {
      throw new BadRequestException('소그룹장은 소그룹 편집에서 교체해주세요.');
    }
    await this.prisma.hobbyGroupMember.delete({
      where: { postId_userId: { postId: id, userId } },
    });
    return this.findOne(id, userId);
  }

  // 신청 승인/거절 — 관리자 또는 소그룹장. 대기(PENDING) 상태만 결정할 수 있다.
  async decideMember(
    requesterId: string,
    id: string,
    targetUserId: string,
    status: 'APPROVED' | 'REJECTED',
  ): Promise<GroupMeetingDetail> {
    await this.assertCanManage(requesterId, id);
    const membership = await this.prisma.hobbyGroupMember.findUnique({
      where: { postId_userId: { postId: id, userId: targetUserId } },
      select: { status: true },
    });
    if (!membership) throw new NotFoundException('신청 내역이 없어요.');
    if (membership.status !== 'PENDING') {
      throw new BadRequestException('대기 중인 신청만 처리할 수 있어요.');
    }
    await this.prisma.hobbyGroupMember.update({
      where: { postId_userId: { postId: id, userId: targetUserId } },
      data: { status },
    });
    return this.findOne(id, requesterId);
  }

  // 모집 상태 — CLOSED로 마감했거나 모집 마감일이 지났으면 닫힘 (DB는 건드리지 않는다).
  private toStatus(group: {
    status: 'RECRUITING' | 'CLOSED';
    recruitEnd: Date | null;
  }): 'open' | 'closed' {
    if (group.status === 'CLOSED') return 'closed';
    if (group.recruitEnd) {
      const today = new Date();
      const todayDate = new Date(
        `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
      );
      if (group.recruitEnd < todayDate) return 'closed';
    }
    return 'open';
  }

  private async assertCanManage(requesterId: string, postId: string) {
    const group = await this.prisma.hobbyGroup.findFirst({
      where: { postId, post: { deletedAt: null } },
      select: {
        members: {
          where: { userId: requesterId, role: 'LEADER' },
          select: { id: true },
        },
      },
    });
    if (!group) throw new NotFoundException('모임을 찾을 수 없습니다.');
    if (group.members.length > 0) return;

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { isAdmin: true },
    });
    if (!requester?.isAdmin) {
      throw new ForbiddenException('소그룹장 또는 관리자만 관리할 수 있습니다.');
    }
  }
}
