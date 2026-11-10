import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TeamFollowerNoteInfo } from '@onnuri/shared';

import { pad, toDateLabel, toKstDate } from '../../common/utils/date';
import { markFollowerNotesViewed } from '../admin/admin-follower-notes.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTeamFollowerNoteCommentDto,
  CreateTeamFollowerNoteDto,
  UpdateTeamFollowerNoteCommentDto,
  UpdateTeamFollowerNoteDto,
} from './dto/team-follower-note.dto';

// "08.17" — 댓글 작성일. 한국 날짜로 읽는다 (UTC로 읽으면 자정~오전 9시 댓글이 전날로 찍힌다).
function toShortDateLabel(date: Date): string {
  const kst = toKstDate(date);
  return `${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())}`;
}

// 팀 팔로워 노트 (SCRUM-180) — 팀장들이 함께 쓰는 팀원 케어 기록. 셀 노트(FollowerNotesService)와
// 같은 규칙을 팀 단위로 옮겼다. 다른 점: 모임 날짜가 없고 본문 하나, 그 팀 현재 팀장이면 누구나
// 쓰고·고치고·지운다(한 노트를 함께 편집 — 동시 수정은 updatedAt으로 막는다).
// 열람·댓글: 그 팀 현재 팀장 + 관리자. 작성·수정·삭제: 그 팀 현재 팀장만 (관리자는 댓글만).
@Injectable()
export class TeamFollowerNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(requesterId: string, teamId: string): Promise<TeamFollowerNoteInfo[]> {
    const { isAdmin } = await this.assertCanView(requesterId, teamId);
    // 관리자가 연 시각을 남긴다 — 팔로워 노트 관리 목록의 "새 노트" 기준 (SCRUM-181).
    if (isAdmin) await markFollowerNotesViewed(this.prisma, requesterId, { teamId });

    const notes = await this.prisma.teamFollowerNote.findMany({
      where: { teamId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        editedById: true,
        author: { select: { name: true, avatarUrl: true } },
        editedBy: { select: { name: true } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            parentId: true,
            authorId: true,
            author: { select: { name: true, isAdmin: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map((note) => {
      const written = toKstDate(note.createdAt);
      return {
        id: note.id,
        dateLabel: toDateLabel(written),
        year: written.getUTCFullYear(),
        month: written.getUTCMonth() + 1,
        authorName: note.author.name,
        authorAvatarUrl: note.author.avatarUrl,
        editedByName:
          note.editedById && note.editedById !== note.authorId
            ? (note.editedBy?.name ?? null)
            : null,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        content: note.content,
        comments: note.comments.map((comment) => ({
          id: comment.id,
          authorName: comment.author.name,
          dateLabel: toShortDateLabel(comment.createdAt),
          content: comment.content,
          isPastor: comment.author.isAdmin,
          parentId: comment.parentId,
          // 수정은 본인만, 삭제는 본인 + 관리자 (셀 노트와 같은 규칙).
          canEdit: comment.authorId === requesterId,
          canDelete: comment.authorId === requesterId || isAdmin,
        })),
      };
    });
  }

  async create(
    requesterId: string,
    teamId: string,
    dto: CreateTeamFollowerNoteDto,
  ): Promise<TeamFollowerNoteInfo[]> {
    await this.assertIsTeamLeader(requesterId, teamId);
    const note = await this.prisma.teamFollowerNote.create({
      data: { teamId, authorId: requesterId, content: dto.content },
      select: { id: true },
    });

    // 관리자 알림 — 셀 노트와 같이 목사님(관리자)이 확인하는 보고라 수신자가 관리자다.
    const [author, team, admins] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } }),
      this.prisma.team.findUnique({ where: { id: teamId }, select: { name: true } }),
      this.prisma.user.findMany({
        where: { isAdmin: true, id: { not: requesterId }, withdrawnAt: null },
        select: { id: true },
      }),
    ]);
    await this.notifications.notify(
      admins.map((admin) => admin.id),
      {
        type: 'FOLLOWER_NOTE',
        title: '팀 팔로워 노트',
        // 팀 이름은 "디자인팀"처럼 접미사를 이미 포함한다.
        body: `${author?.name ?? '팀장'} 팀장님이 ${team?.name ?? '팀'} 팔로워 노트를 작성했어요.`,
        linkUrl: `team-follower-note/${teamId}/${note.id}`,
      },
    );

    return this.findAll(requesterId, teamId);
  }

  async update(
    requesterId: string,
    teamId: string,
    noteId: string,
    dto: UpdateTeamFollowerNoteDto,
  ): Promise<TeamFollowerNoteInfo[]> {
    await this.assertIsTeamLeader(requesterId, teamId);
    const note = await this.findNoteInTeam(noteId, teamId);

    // 화면이 본 시각 이후 다른 팀장이 고쳤으면 덮어쓰지 않는다 — 조건부 갱신이라 사이에 끼어들 틈이 없다.
    const { count } = await this.prisma.teamFollowerNote.updateMany({
      where: { id: note.id, updatedAt: new Date(dto.updatedAt) },
      data: { content: dto.content, editedById: requesterId },
    });
    if (count === 0) {
      throw new ConflictException(
        '다른 팀장이 먼저 수정했어요. 최신 내용을 확인한 뒤 다시 수정해 주세요.',
      );
    }
    return this.findAll(requesterId, teamId);
  }

  async remove(
    requesterId: string,
    teamId: string,
    noteId: string,
  ): Promise<{ id: string }> {
    await this.assertIsTeamLeader(requesterId, teamId);
    const note = await this.findNoteInTeam(noteId, teamId);
    await this.prisma.teamFollowerNote.delete({ where: { id: note.id } });
    return { id: noteId };
  }

  async addComment(
    requesterId: string,
    teamId: string,
    noteId: string,
    dto: CreateTeamFollowerNoteCommentDto,
  ): Promise<TeamFollowerNoteInfo[]> {
    await this.assertCanView(requesterId, teamId);
    const note = await this.findNoteInTeam(noteId, teamId);

    if (dto.parentId) {
      const parent = await this.prisma.teamFollowerNoteComment.findFirst({
        where: { id: dto.parentId, noteId: note.id },
        select: { parentId: true },
      });
      if (!parent) throw new BadRequestException('존재하지 않는 댓글입니다.');
      if (parent.parentId) {
        throw new BadRequestException('대댓글에는 답글을 달 수 없습니다.');
      }
    }

    await this.prisma.teamFollowerNoteComment.create({
      data: {
        noteId: note.id,
        authorId: requesterId,
        content: dto.content,
        parentId: dto.parentId ?? null,
      },
    });
    return this.findAll(requesterId, teamId);
  }

  async updateComment(
    requesterId: string,
    teamId: string,
    noteId: string,
    commentId: string,
    dto: UpdateTeamFollowerNoteCommentDto,
  ): Promise<TeamFollowerNoteInfo[]> {
    await this.assertCanView(requesterId, teamId);
    const comment = await this.findCommentInNote(commentId, noteId, teamId);
    if (comment.authorId !== requesterId) {
      throw new ForbiddenException('내가 쓴 댓글만 수정할 수 있습니다.');
    }
    await this.prisma.teamFollowerNoteComment.update({
      where: { id: comment.id },
      data: { content: dto.content },
    });
    return this.findAll(requesterId, teamId);
  }

  // 지운 댓글에 달린 답글도 같이 지운다 (셀 노트와 같은 이유 — 답글이 원댓글로 올라가 대화가 어긋난다).
  async removeComment(
    requesterId: string,
    teamId: string,
    noteId: string,
    commentId: string,
  ): Promise<TeamFollowerNoteInfo[]> {
    const { isAdmin } = await this.assertCanView(requesterId, teamId);
    const comment = await this.findCommentInNote(commentId, noteId, teamId);
    if (comment.authorId !== requesterId && !isAdmin) {
      throw new ForbiddenException('내가 쓴 댓글만 삭제할 수 있습니다.');
    }
    await this.prisma.teamFollowerNoteComment.deleteMany({
      where: { OR: [{ id: comment.id }, { parentId: comment.id }] },
    });
    return this.findAll(requesterId, teamId);
  }

  private async findCommentInNote(commentId: string, noteId: string, teamId: string) {
    const note = await this.findNoteInTeam(noteId, teamId);
    const comment = await this.prisma.teamFollowerNoteComment.findFirst({
      where: { id: commentId, noteId: note.id },
      select: { id: true, authorId: true },
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    return comment;
  }

  private async findNoteInTeam(noteId: string, teamId: string) {
    const note = await this.prisma.teamFollowerNote.findFirst({
      where: { id: noteId, teamId },
      select: { id: true },
    });
    if (!note) throw new NotFoundException('노트를 찾을 수 없습니다.');
    return note;
  }

  private async assertCanView(requesterId: string, teamId: string) {
    const requester = await this.findRequester(requesterId, teamId);
    const isTeamLeader = (requester?.teamMemberships.length ?? 0) > 0;
    if (!requester || (!requester.isAdmin && !isTeamLeader)) {
      throw new ForbiddenException('팀장 또는 관리자만 볼 수 있습니다.');
    }
    return { isAdmin: requester.isAdmin };
  }

  private async assertIsTeamLeader(requesterId: string, teamId: string) {
    const requester = await this.findRequester(requesterId, teamId);
    if ((requester?.teamMemberships.length ?? 0) === 0) {
      throw new ForbiddenException('그 팀의 팀장만 작성할 수 있습니다.');
    }
  }

  private findRequester(requesterId: string, teamId: string) {
    return this.prisma.user.findUnique({
      where: { id: requesterId },
      select: {
        isAdmin: true,
        teamMemberships: {
          where: { teamId, endedAt: null, role: 'LEADER', team: { deletedAt: null } },
          select: { id: true },
        },
      },
    });
  }
}
