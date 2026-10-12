import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ChatMember, ChatRoomDetail, ChatRoomSummary } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';
import { CreateChatRoomDto } from './dto/chat-room.dto';

// 팀 단톡방 관리 — 팀장·관리자가 방을 만들고, 팀원 중 고른 사람만 넣는다. 이름 수정, 멤버 추가·추방,
// 방 삭제(soft delete)도 그 팀 팀장과 관리자만 한다. 팀원은 자기가 들어간 방만 본다.
@Injectable()
export class ChatRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // 팀 안의 단톡방 목록 — 팀장·관리자는 전부, 팀원은 내가 들어간 방만.
  async findByTeam(userId: string, teamId: string): Promise<ChatRoomSummary[]> {
    const access = await this.assertTeamAccess(userId, teamId);
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        teamId,
        deletedAt: null,
        ...(access.canManage ? {} : { members: { some: { userId } } }),
      },
      select: {
        id: true,
        teamId: true,
        name: true,
        createdAt: true,
        _count: { select: { members: true } },
        messages: {
          where: { deletedAt: null },
          select: { content: true, imageUrls: true, videoUrls: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return rooms
      .map((room) => {
        const last = room.messages[0];
        return {
          id: room.id,
          teamId: room.teamId,
          name: room.name,
          memberCount: room._count.members,
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

  async create(
    userId: string,
    teamId: string,
    dto: CreateChatRoomDto,
  ): Promise<ChatRoomDetail> {
    const access = await this.assertTeamAccess(userId, teamId);
    if (!access.canManage) {
      throw new ForbiddenException('단톡방은 팀장 또는 관리자만 만들 수 있어요.');
    }

    // 만든 사람이 팀원이면 자동으로 넣는다 (관리자는 팀원이 아니어도 모든 방을 볼 수 있다).
    const memberIds = new Set(dto.memberIds);
    if (access.isTeamMember) memberIds.add(userId);
    await this.assertAllTeamMembers(teamId, [...memberIds]);

    const room = await this.prisma.chatRoom.create({
      data: {
        teamId,
        name: dto.name.trim(),
        createdById: userId,
        members: { create: [...memberIds].map((id) => ({ userId: id })) },
      },
      select: { id: true },
    });
    return this.findDetail(userId, room.id);
  }

  async findDetail(userId: string, roomId: string): Promise<ChatRoomDetail> {
    const room = await this.findRoom(roomId);
    const access = await this.assertTeamAccess(userId, room.teamId);
    const isRoomMember = room.members.some((m) => m.user.id === userId);
    if (!access.canManage && !isRoomMember) {
      throw new ForbiddenException('이 단톡방의 멤버만 볼 수 있습니다.');
    }
    return {
      id: room.id,
      teamId: room.teamId,
      name: room.name,
      members: this.toMembers(room.members.map((m) => m.user)),
      canManage: access.canManage,
    };
  }

  async rename(userId: string, roomId: string, name: string): Promise<ChatRoomDetail> {
    await this.assertCanManage(userId, roomId);
    await this.prisma.chatRoom.update({ where: { id: roomId }, data: { name: name.trim() } });
    return this.findDetail(userId, roomId);
  }

  async addMembers(
    userId: string,
    roomId: string,
    userIds: string[],
  ): Promise<ChatRoomDetail> {
    const room = await this.assertCanManage(userId, roomId);
    await this.assertAllTeamMembers(room.teamId, userIds);
    const already = new Set(room.members.map((m) => m.user.id));
    const fresh = userIds.filter((id) => !already.has(id));
    if (fresh.length > 0) {
      await this.prisma.chatRoomMember.createMany({
        data: fresh.map((id) => ({ roomId, userId: id })),
      });
    }
    return this.findDetail(userId, roomId);
  }

  // 추방 — 방에서만 내보낸다 (팀 소속은 그대로).
  async removeMember(
    userId: string,
    roomId: string,
    memberId: string,
  ): Promise<ChatRoomDetail> {
    await this.assertCanManage(userId, roomId);
    const removed = await this.prisma.chatRoomMember.deleteMany({
      where: { roomId, userId: memberId },
    });
    if (removed.count === 0) throw new NotFoundException('이 방의 멤버가 아닙니다.');
    return this.findDetail(userId, roomId);
  }

  // 방 삭제 — 메시지는 보존하되 방 목록에서 사라진다 (soft delete).
  async remove(userId: string, roomId: string): Promise<void> {
    await this.assertCanManage(userId, roomId);
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { deletedAt: new Date() },
    });
  }

  private async findRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      select: {
        id: true,
        teamId: true,
        name: true,
        members: {
          select: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    if (!room) throw new NotFoundException('존재하지 않는 단톡방입니다.');
    return room;
  }

  private async assertCanManage(userId: string, roomId: string) {
    const room = await this.findRoom(roomId);
    const access = await this.assertTeamAccess(userId, room.teamId);
    if (!access.canManage) {
      throw new ForbiddenException('팀장 또는 관리자만 단톡방을 관리할 수 있어요.');
    }
    return room;
  }

  // 그 팀 팀원·팀장이거나 관리자인지 확인한다. canManage = 팀장 또는 관리자.
  private async assertTeamAccess(userId: string, teamId: string) {
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
    const isTeamMember = (requester?.teamMemberships.length ?? 0) > 0;
    if (!isAdmin && !isTeamMember) {
      throw new ForbiddenException('이 팀의 팀원만 볼 수 있습니다.');
    }
    const isLeader = requester?.teamMemberships.some((m) => m.role === 'LEADER') ?? false;
    return { isAdmin, isTeamMember, canManage: isAdmin || isLeader };
  }

  // 방에 넣는 사람은 그 팀의 현재 팀원이어야 한다.
  private async assertAllTeamMembers(teamId: string, userIds: string[]) {
    if (userIds.length === 0) return;
    const count = await this.prisma.teamMembership.count({
      where: { teamId, endedAt: null, userId: { in: userIds } },
    });
    if (count !== userIds.length) {
      throw new BadRequestException('이 팀의 팀원만 단톡방에 넣을 수 있어요.');
    }
  }

  private toMembers(
    users: { id: string; name: string; avatarUrl: string | null }[],
  ): ChatMember[] {
    return users
      .map((user) => ({ id: user.id, name: user.name, avatarUrl: user.avatarUrl }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
}
