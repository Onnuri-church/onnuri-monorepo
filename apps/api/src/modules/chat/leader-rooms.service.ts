import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ChatMember,
  LeaderGrade,
  LeaderRoomCandidate,
  LeaderRoomDetail,
  LeaderRoomSummary,
} from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';
import { LEADER_USER_WHERE } from './leader-grade';

// 전체 리더 방 관리 — 팀장·팔로워(셀장·부셀장)·관리자만 들어오는 단톡방들. 방 만들기·이름 수정·멤버
// 추가/추방·삭제(soft delete)는 관리자만 한다. 리더 등급인 사람은 자기가 들어간 방만 보고, 관리자는 전부 본다.
// 접근은 "방 멤버이면서 지금도 리더 등급"이어야 해서, 강등된 사람은 멤버 행이 남아 있어도 목록·방에서 빠진다.
@Injectable()
export class LeaderRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // 방 목록 — 관리자는 전부, 리더는 내가 들어간 방만.
  async findAll(userId: string): Promise<LeaderRoomSummary[]> {
    const { isAdmin } = await this.assertLeader(userId);
    const rooms = await this.prisma.leaderRoom.findMany({
      where: {
        deletedAt: null,
        ...(isAdmin ? {} : { members: { some: { userId } } }),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { members: { where: { user: LEADER_USER_WHERE } } } },
        messages: {
          where: { deletedAt: null },
          select: {
            content: true,
            imageUrls: true,
            videoUrls: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // 방마다 읽음 위치 이후 다른 사람이 쓴 메시지 수. 읽음 기록이 없는 방은 지금을 읽음 위치로 잡고 0으로 본다
    // (예전 대화가 전부 안 읽은 것으로 뜨지 않게).
    const scopes = rooms.map((room) => `leader:${room.id}`);
    const states = await this.prisma.chatReadState.findMany({
      where: { userId, scope: { in: scopes } },
      select: { scope: true, lastReadAt: true },
    });
    const readAtByScope = new Map(
      states.map((state) => [state.scope, state.lastReadAt]),
    );
    const missing = scopes.filter((scope) => !readAtByScope.has(scope));
    if (missing.length > 0) {
      await this.prisma.chatReadState.createMany({
        data: missing.map((scope) => ({
          userId,
          scope,
          lastReadAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }
    const unreadByRoom = new Map<string, number>();
    await Promise.all(
      rooms.map(async (room) => {
        const readAt = readAtByScope.get(`leader:${room.id}`);
        unreadByRoom.set(
          room.id,
          readAt
            ? await this.prisma.chatMessage.count({
                where: {
                  leaderRoomId: room.id,
                  deletedAt: null,
                  authorId: { not: userId },
                  createdAt: { gt: readAt },
                },
              })
            : 0,
        );
      }),
    );

    return rooms
      .map((room) => {
        const last = room.messages[0];
        return {
          id: room.id,
          name: room.name,
          memberCount: room._count.members,
          unreadCount: unreadByRoom.get(room.id) ?? 0,
          lastMessage: last
            ? last.content ||
              (last.videoUrls.length > 0
                ? '동영상'
                : last.imageUrls.length > 0
                  ? '사진'
                  : '파일')
            : null,
          lastActivityAt: (last?.createdAt ?? room.createdAt).toISOString(),
        };
      })
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  }

  // 방에 넣을 수 있는 사람(리더 등급 전체) — 방 만들기·멤버 추가 화면의 선택지. 관리자 전용.
  async findCandidates(userId: string): Promise<LeaderRoomCandidate[]> {
    await this.assertAdmin(userId);
    const users = await this.prisma.user.findMany({
      where: LEADER_USER_WHERE,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        isAdmin: true,
        teamMemberships: {
          where: { endedAt: null, role: 'LEADER', team: { deletedAt: null } },
          select: { team: { select: { name: true } } },
        },
        cellMemberships: {
          where: {
            endedAt: null,
            role: { in: ['LEADER', 'SUB_LEADER'] },
            cell: { deletedAt: null },
          },
          select: { role: true, cell: { select: { name: true } } },
        },
      },
    });

    return users
      .map((user): LeaderRoomCandidate => {
        const cell = user.cellMemberships[0];
        // 가장 높은 등급 하나만 보여준다: 관리자 > 팀장 > 셀장 > 부셀장
        const grade: LeaderGrade = user.isAdmin
          ? 'admin'
          : user.teamMemberships.length > 0
            ? 'teamLeader'
            : cell?.role === 'LEADER'
              ? 'cellLeader'
              : 'viceLeader';
        return {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          grade,
          affiliation:
            grade === 'teamLeader'
              ? user.teamMemberships.map((m) => m.team.name).join(', ')
              : cell
                ? cell.cell.name
                : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  async create(
    userId: string,
    name: string,
    memberIds: string[],
  ): Promise<LeaderRoomDetail> {
    await this.assertAdmin(userId);
    await this.assertAllLeaders(memberIds);
    const room = await this.prisma.leaderRoom.create({
      data: {
        name: name.trim(),
        createdById: userId,
        members: { create: memberIds.map((id) => ({ userId: id })) },
      },
      select: { id: true },
    });
    return this.findDetail(userId, room.id);
  }

  async findDetail(userId: string, roomId: string): Promise<LeaderRoomDetail> {
    const { isAdmin } = await this.assertLeader(userId);
    const room = await this.findRoom(roomId);
    if (!isAdmin && !room.members.some((m) => m.user.id === userId)) {
      throw new ForbiddenException('이 단톡방의 멤버만 볼 수 있습니다.');
    }
    return {
      id: room.id,
      name: room.name,
      members: this.toMembers(room.members.map((m) => m.user)),
      canManage: isAdmin,
    };
  }

  async rename(
    userId: string,
    roomId: string,
    name: string,
  ): Promise<LeaderRoomDetail> {
    await this.assertAdmin(userId);
    await this.findRoom(roomId);
    await this.prisma.leaderRoom.update({
      where: { id: roomId },
      data: { name: name.trim() },
    });
    return this.findDetail(userId, roomId);
  }

  async addMembers(
    userId: string,
    roomId: string,
    userIds: string[],
  ): Promise<LeaderRoomDetail> {
    await this.assertAdmin(userId);
    await this.findRoom(roomId);
    await this.assertAllLeaders(userIds);
    // 이미 들어 있으면 그대로 둔다 (강등돼 목록에서 숨은 멤버가 다시 추가돼도 중복 행이 안 생기게)
    await this.prisma.leaderRoomMember.createMany({
      data: userIds.map((id) => ({ roomId, userId: id })),
      skipDuplicates: true,
    });
    return this.findDetail(userId, roomId);
  }

  // 추방 — 방에서만 내보낸다.
  async removeMember(
    userId: string,
    roomId: string,
    memberId: string,
  ): Promise<LeaderRoomDetail> {
    await this.assertAdmin(userId);
    await this.findRoom(roomId);
    const removed = await this.prisma.leaderRoomMember.deleteMany({
      where: { roomId, userId: memberId },
    });
    if (removed.count === 0)
      throw new NotFoundException('이 방의 멤버가 아닙니다.');
    return this.findDetail(userId, roomId);
  }

  // 방 삭제 — 메시지는 보존하되 방 목록에서 사라진다 (soft delete).
  async remove(userId: string, roomId: string): Promise<void> {
    await this.assertAdmin(userId);
    await this.findRoom(roomId);
    await this.prisma.leaderRoom.update({
      where: { id: roomId },
      data: { deletedAt: new Date() },
    });
  }

  // 멤버는 지금도 리더 등급인 사람만 보여준다 (강등된 사람은 숨긴다).
  private async findRoom(roomId: string) {
    const room = await this.prisma.leaderRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      select: {
        id: true,
        name: true,
        members: {
          where: { user: LEADER_USER_WHERE },
          select: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!room) throw new NotFoundException('존재하지 않는 단톡방입니다.');
    return room;
  }

  // 리더 등급(관리자 포함)인지 확인한다.
  private async assertLeader(userId: string): Promise<{ isAdmin: boolean }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...LEADER_USER_WHERE },
      select: { isAdmin: true },
    });
    if (!user) {
      throw new ForbiddenException(
        '전체 리더 방은 팀장·셀장·관리자만 쓸 수 있어요.',
      );
    }
    return { isAdmin: user.isAdmin };
  }

  private async assertAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (user?.isAdmin !== true) {
      throw new ForbiddenException('관리자만 할 수 있어요.');
    }
  }

  // 방에 넣는 사람은 모두 지금 리더 등급이어야 한다.
  private async assertAllLeaders(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const count = await this.prisma.user.count({
      where: { id: { in: userIds }, ...LEADER_USER_WHERE },
    });
    if (count !== new Set(userIds).size) {
      throw new BadRequestException(
        '팀장·셀장·부셀장·관리자만 리더 방에 넣을 수 있어요.',
      );
    }
  }

  private toMembers(
    users: { id: string; name: string; avatarUrl: string | null }[],
  ): ChatMember[] {
    return users
      .map((user) => ({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
}
