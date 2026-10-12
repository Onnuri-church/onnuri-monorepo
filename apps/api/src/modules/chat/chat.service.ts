import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ChatFile,
  ChatMember,
  ChatMessageInfo,
  ChatRoomResponse,
} from '@onnuri/shared';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

// 처음 열 때 받는 최근 메시지 수 — 그 이전은 지금 단계에서 불러오지 않는다.
const RECENT_LIMIT = 100;
// 알림 본문에 싣는 메시지 미리보기 길이
const SNIPPET_LENGTH = 40;

/** 단톡방 하나 — 팀 단톡방(roomId)이나 셀 단톡방(cellId) 중 하나. */
export type ChatRoom = { roomId: string } | { cellId: string };

interface RoomAccess {
  isAdmin: boolean;
  canNotice: boolean;
  members: ChatMember[];
  linkUrl: string;
}

const MESSAGE_SELECT = {
  id: true,
  authorId: true,
  content: true,
  imageUrls: true,
  videoUrls: true,
  files: true,
  mentionedUserIds: true,
  noticeAt: true,
  createdAt: true,
  author: { select: { name: true, avatarUrl: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      imageUrls: true,
      deletedAt: true,
      author: { select: { name: true } },
    },
  },
  reactions: { select: { userId: true, emoji: true } },
} as const;

type MessageRow = {
  id: string;
  authorId: string;
  content: string;
  imageUrls: string[];
  videoUrls: string[];
  files: unknown;
  mentionedUserIds: string[];
  noticeAt: Date | null;
  createdAt: Date;
  author: { name: string; avatarUrl: string | null };
  replyTo: {
    id: string;
    content: string;
    imageUrls: string[];
    deletedAt: Date | null;
    author: { name: string };
  } | null;
  reactions: { userId: string; emoji: string }[];
};

// 단톡방 — 팀·셀 단톡방이 같은 로직을 쓴다. 그 방의 소속 멤버와 관리자만 읽고 쓴다.
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async find(userId: string, room: ChatRoom): Promise<ChatRoomResponse> {
    const access = await this.assertAccess(userId, room);

    const [recent, latestNotice] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { ...this.roomWhere(room), deletedAt: null },
        select: MESSAGE_SELECT,
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
      }),
      this.prisma.chatMessage.findFirst({
        where: { ...this.roomWhere(room), deletedAt: null, noticeAt: { not: null } },
        select: MESSAGE_SELECT,
        orderBy: { noticeAt: 'desc' },
      }),
    ]);

    const memberNames = new Map(access.members.map((member) => [member.id, member.name]));
    return {
      messages: recent
        .reverse()
        .map((row) => this.toInfo(row, userId, access.isAdmin, memberNames)),
      notice: latestNotice
        ? this.toInfo(latestNotice, userId, access.isAdmin, memberNames)
        : null,
      members: access.members,
      canNotice: access.canNotice,
    };
  }

  async send(
    userId: string,
    room: ChatRoom,
    dto: SendChatMessageDto,
  ): Promise<ChatMessageInfo> {
    const access = await this.assertAccess(userId, room);
    const content = dto.content.trim();
    const imageUrls = dto.imageUrls ?? [];
    const videoUrls = dto.videoUrls ?? [];
    const files = (dto.files ?? []).map((file) => ({
      url: file.url,
      name: file.name,
      size: file.size,
    }));
    if (!content && imageUrls.length + videoUrls.length + files.length === 0) {
      throw new BadRequestException('내용이나 첨부 중 하나는 필요합니다.');
    }
    if (dto.asNotice && !access.canNotice) {
      throw new ForbiddenException('공지는 팀장·셀장·관리자만 등록할 수 있어요.');
    }

    if (dto.replyToId) {
      const target = await this.prisma.chatMessage.findFirst({
        where: { id: dto.replyToId, ...this.roomWhere(room), deletedAt: null },
        select: { id: true },
      });
      if (!target) throw new BadRequestException('답장할 메시지를 찾을 수 없어요.');
    }

    // 언급은 이 방의 멤버만 남긴다 (본인은 제외).
    const memberIds = new Set(access.members.map((member) => member.id));
    const mentionedUserIds = (dto.mentionedUserIds ?? []).filter(
      (id) => memberIds.has(id) && id !== userId,
    );

    const row = await this.prisma.chatMessage.create({
      data: {
        ...room,
        authorId: userId,
        content,
        imageUrls,
        videoUrls,
        files,
        replyToId: dto.replyToId ?? null,
        mentionedUserIds,
        noticeAt: dto.asNotice ? new Date() : null,
      },
      select: MESSAGE_SELECT,
    });

    const memberNames = new Map(access.members.map((member) => [member.id, member.name]));
    const info = this.toInfo(row, userId, access.isAdmin, memberNames);
    await this.notifyRoom(userId, info, access, mentionedUserIds, dto.asNotice === true);
    return info;
  }

  // 공지 등록·해제 — 기존 메시지를 공지로 올리거나 내린다 (canNotice인 사람만).
  async setNotice(
    userId: string,
    room: ChatRoom,
    messageId: string,
    on: boolean,
  ): Promise<ChatMessageInfo> {
    const access = await this.assertAccess(userId, room);
    if (!access.canNotice) {
      throw new ForbiddenException('공지는 팀장·셀장·관리자만 등록할 수 있어요.');
    }
    await this.assertMessage(room, messageId);
    const row = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { noticeAt: on ? new Date() : null },
      select: MESSAGE_SELECT,
    });
    const memberNames = new Map(access.members.map((member) => [member.id, member.name]));
    return this.toInfo(row, userId, access.isAdmin, memberNames);
  }

  // 이모지 반응 토글 — 이미 눌렀으면 취소, 아니면 추가.
  async toggleReaction(
    userId: string,
    room: ChatRoom,
    messageId: string,
    emoji: string,
  ): Promise<ChatMessageInfo> {
    const access = await this.assertAccess(userId, room);
    await this.assertMessage(room, messageId);

    const existing = await this.prisma.chatReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.chatReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.chatReaction.create({ data: { messageId, userId, emoji } });
    }

    const row = await this.prisma.chatMessage.findUniqueOrThrow({
      where: { id: messageId },
      select: MESSAGE_SELECT,
    });
    const memberNames = new Map(access.members.map((member) => [member.id, member.name]));
    return this.toInfo(row, userId, access.isAdmin, memberNames);
  }

  // 내 메시지 또는 관리자만 지울 수 있다 (soft delete).
  async remove(userId: string, room: ChatRoom, messageId: string): Promise<void> {
    const access = await this.assertAccess(userId, room);
    const message = await this.assertMessage(room, messageId);
    if (message.authorId !== userId && !access.isAdmin) {
      throw new ForbiddenException('내가 보낸 메시지만 삭제할 수 있습니다.');
    }
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), noticeAt: null },
    });
  }

  private roomWhere(room: ChatRoom) {
    return 'roomId' in room ? { roomId: room.roomId } : { cellId: room.cellId };
  }

  private async assertMessage(room: ChatRoom, messageId: string) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, ...this.roomWhere(room), deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!message) throw new NotFoundException('메시지를 찾을 수 없습니다.');
    return message;
  }

  // 방이 있고 내가 그 방의 멤버(또는 관리자)인지 확인하고, 방 정보를 돌려준다.
  private async assertAccess(userId: string, room: ChatRoom): Promise<RoomAccess> {
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    const isAdmin = requester?.isAdmin === true;

    if ('roomId' in room) {
      // 팀 단톡방 — 방 멤버, 그 팀 팀장, 관리자만 들어온다. 방 이름·멤버는 방 단위로 관리한다.
      const chatRoom = await this.prisma.chatRoom.findFirst({
        where: { id: room.roomId, deletedAt: null },
        select: {
          createdById: true,
          team: {
            select: {
              memberships: {
                where: { endedAt: null, userId },
                select: { role: true },
              },
            },
          },
          members: {
            select: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      });
      if (!chatRoom) throw new NotFoundException('존재하지 않는 단톡방입니다.');
      const isLeader = chatRoom.team.memberships.some((m) => m.role === 'LEADER');
      const isMember = chatRoom.members.some((m) => m.user.id === userId);
      if (!isAdmin && !isLeader && !isMember) {
        throw new ForbiddenException('이 단톡방의 멤버만 볼 수 있습니다.');
      }
      return {
        isAdmin,
        canNotice: isAdmin || isLeader || chatRoom.createdById === userId,
        members: this.toMembers(chatRoom.members.map((m) => m.user)),
        linkUrl: `team-room/${room.roomId}`,
      };
    }

    const cell = await this.prisma.cell.findFirst({
      where: { id: room.cellId, deletedAt: null },
      select: {
        memberships: {
          where: { endedAt: null },
          select: {
            role: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!cell) throw new NotFoundException('존재하지 않는 셀입니다.');
    const mine = cell.memberships.find((m) => m.user.id === userId);
    if (!isAdmin && !mine) {
      throw new ForbiddenException('이 셀의 셀원만 볼 수 있습니다.');
    }
    return {
      isAdmin,
      canNotice: isAdmin || (mine !== undefined && mine.role !== 'MEMBER'),
      members: this.toMembers(cell.memberships.map((m) => m.user)),
      linkUrl: `cell-chat/${room.cellId}`,
    };
  }

  private toMembers(
    users: { id: string; name: string; avatarUrl: string | null }[],
  ): ChatMember[] {
    return users
      .map((user) => ({ id: user.id, name: user.name, avatarUrl: user.avatarUrl }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  // 알림 — 언급은 알림센터에 쌓고 푸시, 공지도 같이 쌓는다. 일반 메시지는 알림센터를
  // 어지럽히지 않게 푸시만 보낸다. 본인은 뺀다.
  private async notifyRoom(
    authorId: string,
    info: ChatMessageInfo,
    access: RoomAccess,
    mentionedUserIds: string[],
    asNotice: boolean,
  ) {
    const snippet = this.snippet(info);
    const others = access.members.map((m) => m.id).filter((id) => id !== authorId);

    const mentionTargets = mentionedUserIds;
    if (mentionTargets.length > 0) {
      await this.notifications.notify(mentionTargets, {
        type: 'CHAT',
        title: '단톡방',
        body: `${info.authorName}님이 회원님을 언급했어요: ${snippet}`,
        linkUrl: access.linkUrl,
      });
    }

    const rest = others.filter((id) => !mentionTargets.includes(id));
    if (rest.length === 0) return;
    if (asNotice) {
      await this.notifications.notify(rest, {
        type: 'CHAT',
        title: '단톡방',
        body: `${info.authorName}님이 공지를 올렸어요: ${snippet}`,
        linkUrl: access.linkUrl,
      });
      return;
    }
    await this.notifications.pushOnly(rest, {
      type: 'CHAT',
      title: '단톡방',
      body: `${info.authorName}: ${snippet}`,
      linkUrl: access.linkUrl,
    });
  }

  private snippet(info: ChatMessageInfo): string {
    const text = info.content.trim();
    if (!text) {
      if (info.videoUrls.length > 0) return '동영상을 보냈어요';
      if (info.files.length > 0) return '파일을 보냈어요';
      return '사진을 보냈어요';
    }
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }

  // Json 컬럼은 타입이 없어서 모양을 확인해서 꺼낸다 (서버가 저장한 값이지만 방어적으로).
  private toFiles(value: unknown): ChatFile[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      const file = item as Partial<ChatFile> | null;
      return file && typeof file.url === 'string' && typeof file.name === 'string'
        ? [{ url: file.url, name: file.name, size: Number(file.size) || 0 }]
        : [];
    });
  }

  private toInfo(
    row: MessageRow,
    requesterId: string,
    isAdmin: boolean,
    memberNames: Map<string, string>,
  ): ChatMessageInfo {
    const isMine = row.authorId === requesterId;
    const counts = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const reaction of row.reactions) {
      const current = counts.get(reaction.emoji) ?? { count: 0, reactedByMe: false };
      counts.set(reaction.emoji, {
        count: current.count + 1,
        reactedByMe: current.reactedByMe || reaction.userId === requesterId,
      });
    }

    return {
      id: row.id,
      authorId: row.authorId,
      authorName: row.author.name,
      authorAvatarUrl: row.author.avatarUrl,
      content: row.content,
      imageUrls: row.imageUrls,
      videoUrls: row.videoUrls,
      files: this.toFiles(row.files),
      replyTo:
        row.replyTo && !row.replyTo.deletedAt
          ? {
              id: row.replyTo.id,
              authorName: row.replyTo.author.name,
              content: row.replyTo.content,
              hasImage: row.replyTo.imageUrls.length > 0,
            }
          : null,
      mentions: row.mentionedUserIds.flatMap((id) => {
        const name = memberNames.get(id);
        return name ? [{ id, name }] : [];
      }),
      isNotice: row.noticeAt !== null,
      reactions: [...counts.entries()].map(([emoji, value]) => ({ emoji, ...value })),
      createdAt: row.createdAt.toISOString(),
      isMine,
      canDelete: isMine || isAdmin,
    };
  }
}
