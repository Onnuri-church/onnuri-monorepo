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
  ChatPollInfo,
  ChatRoomResponse,
} from '@onnuri/shared';

import type { Prisma } from '../../../generated/prisma';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { LEADER_USER_WHERE } from './leader-grade';
import {
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  SendChatMessageDto,
} from './dto/send-chat-message.dto';

// 처음 열 때 받는 최근 메시지 수 — 그 이전은 지금 단계에서 불러오지 않는다.
const RECENT_LIMIT = 100;
// 알림 본문에 싣는 메시지 미리보기 길이
const SNIPPET_LENGTH = 40;

/**
 * 단톡방 하나 — 팀 단톡방(roomId), 셀 단톡방(cellId), 취향소그룹 단톡방(groupId),
 * 전체 리더 방(leaderRoomId) 중 하나.
 */
export type ChatRoom =
  | { roomId: string }
  | { cellId: string }
  | { groupId: string }
  | { leaderRoomId: string };

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
  poll: {
    select: {
      id: true,
      title: true,
      multiple: true,
      anonymous: true,
      allowAddOptions: true,
      closesAt: true,
      closedAt: true,
      createdById: true,
      options: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          text: true,
          votes: {
            select: {
              userId: true,
              user: { select: { name: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ChatMessageSelect;

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
  poll: {
    id: string;
    title: string;
    multiple: boolean;
    anonymous: boolean;
    allowAddOptions: boolean;
    closesAt: Date | null;
    closedAt: Date | null;
    createdById: string;
    options: {
      id: string;
      text: string;
      votes: { userId: string; user: { name: string; avatarUrl: string | null } }[];
    }[];
  } | null;
};

// 단톡방 — 팀·셀·소그룹·전체 리더 방이 같은 로직을 쓴다. 그 방의 소속 멤버와 관리자만 읽고 쓴다.
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private readScope(room: ChatRoom): string {
    if ('roomId' in room) return `room:${room.roomId}`;
    if ('cellId' in room) return `cell:${room.cellId}`;
    if ('leaderRoomId' in room) return `leader:${room.leaderRoomId}`;
    return `group:${room.groupId}`;
  }

  // 방을 읽었다고 표시 — 방을 열어 두고 있는 동안 새 메시지가 오면 앱이 다시 부른다.
  async markRead(userId: string, room: ChatRoom): Promise<void> {
    await this.assertAccess(userId, room);
    const now = new Date();
    await this.prisma.chatReadState.upsert({
      where: { userId_scope: { userId, scope: this.readScope(room) } },
      update: { lastReadAt: now },
      create: { userId, scope: this.readScope(room), lastReadAt: now },
    });
  }

  // 안 읽은 메시지 수 — 읽음 위치 이후 다른 사람이 쓴 메시지. 읽음 기록이 아직 없는 방은
  // 지금까지의 대화를 전부 안 읽은 것으로 세지 않도록 "지금"을 읽음 위치로 잡고 0을 돌려준다.
  async unreadCount(userId: string, room: ChatRoom): Promise<{ count: number }> {
    await this.assertAccess(userId, room);
    const scope = this.readScope(room);
    const state = await this.prisma.chatReadState.findUnique({
      where: { userId_scope: { userId, scope } },
      select: { lastReadAt: true },
    });
    if (!state) {
      await this.prisma.chatReadState.upsert({
        where: { userId_scope: { userId, scope } },
        update: {},
        create: { userId, scope, lastReadAt: new Date() },
      });
      return { count: 0 };
    }
    const count = await this.prisma.chatMessage.count({
      where: {
        ...this.roomWhere(room),
        deletedAt: null,
        authorId: { not: userId },
        createdAt: { gt: state.lastReadAt },
      },
    });
    return { count };
  }

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
        .map((row) => this.toInfo(row, userId, access, memberNames)),
      notice: latestNotice
        ? this.toInfo(latestNotice, userId, access, memberNames)
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
    // 투표 메시지면 내용은 투표 제목이고 첨부는 받지 않는다.
    const poll = dto.poll ? this.normalizePoll(dto.poll) : null;
    const content = poll ? poll.title : dto.content.trim();
    const imageUrls = poll ? [] : (dto.imageUrls ?? []);
    const videoUrls = poll ? [] : (dto.videoUrls ?? []);
    const files = (poll ? [] : (dto.files ?? [])).map((file) => ({
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
        ...(poll && {
          poll: {
            create: {
              title: poll.title,
              multiple: poll.multiple,
              anonymous: poll.anonymous,
              allowAddOptions: poll.allowAddOptions,
              closesAt: poll.closesAt,
              createdById: userId,
              options: {
                create: poll.options.map((text, index) => ({ text, sortOrder: index })),
              },
            },
          },
        }),
      },
      select: MESSAGE_SELECT,
    });

    const memberNames = new Map(access.members.map((member) => [member.id, member.name]));
    const info = this.toInfo(row, userId, access, memberNames);
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
    return this.toInfo(row, userId, access, memberNames);
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
    return this.toInfo(row, userId, access, memberNames);
  }

  // ---- 투표 ------------------------------------------------------------

  // 내 선택 전체를 교체한다 (빈 배열이면 투표 취소). 마감 후에는 못 바꾼다.
  async votePoll(userId: string, pollId: string, optionIds: string[]): Promise<ChatMessageInfo> {
    const { poll, access } = await this.loadPoll(userId, pollId);
    this.assertPollOpen(poll);
    const unique = Array.from(new Set(optionIds));
    const valid = new Set(poll.options.map((option) => option.id));
    if (unique.some((id) => !valid.has(id))) {
      throw new BadRequestException('이 투표에 없는 항목이에요.');
    }
    if (!poll.multiple && unique.length > 1) {
      throw new BadRequestException('이 투표는 하나만 고를 수 있어요.');
    }
    await this.prisma.$transaction([
      this.prisma.chatPollVote.deleteMany({ where: { pollId, userId } }),
      this.prisma.chatPollVote.createMany({
        data: unique.map((optionId) => ({ pollId, optionId, userId })),
      }),
    ]);
    return this.reloadPollMessage(userId, poll.message.id, access);
  }

  // 항목 추가 — 만든 사람이 허용한 투표에서, 마감 전에만. 같은 이름이 이미 있으면 그대로 둔다.
  async addPollOption(userId: string, pollId: string, text: string): Promise<ChatMessageInfo> {
    const { poll, access } = await this.loadPoll(userId, pollId);
    this.assertPollOpen(poll);
    if (!poll.allowAddOptions && poll.createdById !== userId) {
      throw new ForbiddenException('이 투표는 항목을 추가할 수 없어요.');
    }
    const trimmed = text.trim();
    if (!trimmed) throw new BadRequestException('항목을 입력해주세요.');
    if (poll.options.length >= POLL_MAX_OPTIONS) {
      throw new BadRequestException('항목은 10개까지 만들 수 있어요.');
    }
    const exists = poll.options.some((option) => option.text === trimmed);
    if (!exists) {
      await this.prisma.chatPollOption.create({
        data: {
          pollId,
          text: trimmed,
          sortOrder: poll.options.length,
          createdById: userId,
        },
      });
    }
    return this.reloadPollMessage(userId, poll.message.id, access);
  }

  // 직접 마감 — 만든 사람, 그 방의 팀장·셀장·소그룹장, 관리자.
  async closePoll(userId: string, pollId: string): Promise<ChatMessageInfo> {
    const { poll, access } = await this.loadPoll(userId, pollId);
    if (poll.createdById !== userId && !access.canNotice && !access.isAdmin) {
      throw new ForbiddenException('투표를 마감할 권한이 없어요.');
    }
    if (poll.closedAt === null) {
      await this.prisma.chatPoll.update({
        where: { id: pollId },
        data: { closedAt: new Date() },
      });
      // 다른 사람이 마감했으면 만든 사람에게 알려 준다.
      if (poll.createdById !== userId) {
        await this.notifications.notify([poll.createdById], {
          type: 'CHAT',
          title: '단톡방',
          body: `투표가 마감됐어요: ${poll.title}`,
          linkUrl: access.linkUrl,
        });
      }
    }
    return this.reloadPollMessage(userId, poll.message.id, access);
  }

  // 마감 시각이 지난 투표를 마감 처리하고 만든 사람에게 알린다 (5분마다).
  @Cron('*/5 * * * *')
  async closeExpiredPolls(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.chatPoll.findMany({
      where: { closedAt: null, closesAt: { lte: now } },
      select: {
        id: true,
        title: true,
        closesAt: true,
        createdById: true,
        message: {
          select: {
            roomId: true,
            cellId: true,
            groupId: true,
            leaderRoomId: true,
          },
        },
      },
    });
    for (const poll of expired) {
      await this.prisma.chatPoll.update({
        where: { id: poll.id },
        data: { closedAt: poll.closesAt ?? now },
      });
      const { roomId, cellId, groupId, leaderRoomId } = poll.message;
      const linkUrl = roomId
        ? `team-room/${roomId}`
        : groupId
          ? `group-room/${groupId}`
          : leaderRoomId
            ? `leader-room/${leaderRoomId}`
            : `cell-chat/${cellId}`;
      await this.notifications.notify([poll.createdById], {
        type: 'CHAT',
        title: '단톡방',
        body: `투표가 마감됐어요: ${poll.title}`,
        linkUrl,
      });
    }
  }

  // 투표를 찾고, 그 투표가 올라온 방의 접근 권한까지 확인한다.
  private async loadPoll(userId: string, pollId: string) {
    const poll = await this.prisma.chatPoll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        title: true,
        multiple: true,
        allowAddOptions: true,
        closesAt: true,
        closedAt: true,
        createdById: true,
        options: { select: { id: true, text: true } },
        message: {
          select: {
            id: true,
            deletedAt: true,
            roomId: true,
            cellId: true,
            groupId: true,
            leaderRoomId: true,
          },
        },
      },
    });
    if (!poll || poll.message.deletedAt) throw new NotFoundException('투표를 찾을 수 없어요.');
    const { roomId, cellId, groupId, leaderRoomId } = poll.message;
    const room: ChatRoom = roomId
      ? { roomId }
      : groupId
        ? { groupId }
        : leaderRoomId
          ? { leaderRoomId }
          : { cellId: cellId as string };
    const access = await this.assertAccess(userId, room);
    return { poll, access };
  }

  private assertPollOpen(poll: { closedAt: Date | null; closesAt: Date | null }) {
    const closed =
      poll.closedAt !== null || (poll.closesAt !== null && poll.closesAt.getTime() <= Date.now());
    if (closed) throw new BadRequestException('마감된 투표예요.');
  }

  private async reloadPollMessage(
    userId: string,
    messageId: string,
    access: RoomAccess,
  ): Promise<ChatMessageInfo> {
    const row = await this.prisma.chatMessage.findUniqueOrThrow({
      where: { id: messageId },
      select: MESSAGE_SELECT,
    });
    const memberNames = new Map(access.members.map((member) => [member.id, member.name]));
    return this.toInfo(row, userId, access, memberNames);
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
    if ('roomId' in room) return { roomId: room.roomId };
    if ('groupId' in room) return { groupId: room.groupId };
    if ('leaderRoomId' in room) return { leaderRoomId: room.leaderRoomId };
    return { cellId: room.cellId };
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

    if ('leaderRoomId' in room) {
      // 전체 리더 방 — 관리자가 고른 멤버 중 지금도 리더 등급인 사람과 관리자만 들어온다.
      // 멤버 목록도 같은 조건으로 걸러서, 강등된 사람에게는 알림·언급이 가지 않는다.
      // 방 안의 멤버는 모두 리더라 공지는 들어와 있는 누구나 올릴 수 있다.
      const leaderRoom = await this.prisma.leaderRoom.findFirst({
        where: { id: room.leaderRoomId, deletedAt: null },
        select: {
          members: {
            where: { user: LEADER_USER_WHERE },
            select: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      });
      if (!leaderRoom) throw new NotFoundException('존재하지 않는 단톡방입니다.');
      const isMember = leaderRoom.members.some((m) => m.user.id === userId);
      if (!isAdmin && !isMember) {
        throw new ForbiddenException('이 단톡방의 멤버만 볼 수 있습니다.');
      }
      return {
        isAdmin,
        canNotice: true,
        members: this.toMembers(leaderRoom.members.map((m) => m.user)),
        linkUrl: `leader-room/${room.leaderRoomId}`,
      };
    }

    if ('groupId' in room) {
      // 취향소그룹 단톡방 — 승인된 참여자(소그룹장 포함)와 관리자만 들어온다. 신청만 했거나 거절된
      // 사람은 멤버 상태가 APPROVED가 아니라 자동으로 막힌다.
      const group = await this.prisma.hobbyGroup.findFirst({
        where: { postId: room.groupId, post: { deletedAt: null } },
        select: {
          members: {
            where: { status: 'APPROVED' },
            select: {
              role: true,
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      });
      if (!group) throw new NotFoundException('존재하지 않는 소그룹입니다.');
      const mine = group.members.find((m) => m.user.id === userId);
      if (!isAdmin && !mine) {
        throw new ForbiddenException('이 소그룹에 참여 중인 사람만 볼 수 있습니다.');
      }
      return {
        isAdmin,
        canNotice: isAdmin || mine?.role === 'LEADER',
        members: this.toMembers(group.members.map((m) => m.user)),
        linkUrl: `group-room/${room.groupId}`,
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
    if (info.poll) return `투표: ${info.poll.title}`;
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

  // 투표 입력 정리 — 항목 공백 제거·중복 제거, 개수·마감 시각 검사.
  private normalizePoll(input: {
    title: string;
    options: string[];
    multiple?: boolean;
    anonymous?: boolean;
    allowAddOptions?: boolean;
    closesAt?: string;
  }) {
    const title = input.title.trim();
    const options = Array.from(new Set(input.options.map((text) => text.trim()).filter(Boolean)));
    if (!title) throw new BadRequestException('투표 제목을 입력해주세요.');
    if (options.length < POLL_MIN_OPTIONS || options.length > POLL_MAX_OPTIONS) {
      throw new BadRequestException('항목은 서로 다른 2~10개여야 해요.');
    }
    let closesAt: Date | null = null;
    if (input.closesAt) {
      closesAt = new Date(input.closesAt);
      if (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
        throw new BadRequestException('마감 시각은 지금보다 뒤여야 해요.');
      }
    }
    return {
      title,
      options,
      multiple: input.multiple === true,
      anonymous: input.anonymous === true,
      allowAddOptions: input.allowAddOptions === true,
      closesAt,
    };
  }

  private toPollInfo(
    poll: NonNullable<MessageRow['poll']>,
    requesterId: string,
    access: { isAdmin: boolean; canNotice: boolean },
  ): ChatPollInfo {
    const voterIds = new Set<string>();
    const options = poll.options.map((option) => {
      for (const vote of option.votes) voterIds.add(vote.userId);
      return {
        id: option.id,
        text: option.text,
        count: option.votes.length,
        votedByMe: option.votes.some((vote) => vote.userId === requesterId),
        // 익명 투표는 누가 골랐는지 내려보내지 않는다 (만든 사람·관리자에게도).
        voters: poll.anonymous
          ? []
          : option.votes.map((vote) => ({
              id: vote.userId,
              name: vote.user.name,
              avatarUrl: vote.user.avatarUrl,
            })),
      };
    });
    const closed =
      poll.closedAt !== null || (poll.closesAt !== null && poll.closesAt.getTime() <= Date.now());
    return {
      id: poll.id,
      title: poll.title,
      options,
      multiple: poll.multiple,
      anonymous: poll.anonymous,
      allowAddOptions: poll.allowAddOptions,
      closesAt: poll.closesAt?.toISOString() ?? null,
      closed,
      voterCount: voterIds.size,
      canClose: !closed && (poll.createdById === requesterId || access.canNotice || access.isAdmin),
    };
  }

  private toInfo(
    row: MessageRow,
    requesterId: string,
    access: { isAdmin: boolean; canNotice: boolean },
    memberNames: Map<string, string>,
  ): ChatMessageInfo {
    const isAdmin = access.isAdmin;
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
      poll: row.poll ? this.toPollInfo(row.poll, requesterId, access) : null,
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
