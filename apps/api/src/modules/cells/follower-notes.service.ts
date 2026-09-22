import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FollowerNoteInfo } from '@onnuri/shared';

import { pad, toDateLabel, toDayLabel } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowerNoteCommentDto } from './dto/create-follower-note-comment.dto';
import { CreateFollowerNoteDto } from './dto/create-follower-note.dto';
import { UpdateFollowerNoteDto } from './dto/update-follower-note.dto';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// "08.17" — 댓글 작성일 (시안 표기). createdAt은 시각이 있는 값이라 로컬(KST) 기준이 맞지만,
// 서버·DB가 UTC라 date util들과 같은 UTC 기준으로 통일한다 (몇 시간 차이는 날짜 표기에 무해).
function toShortDateLabel(date: Date): string {
  return `${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`;
}

// 팔로워 노트 — 셀 케어 기록이라 게시판(Post)이 아니라 CellMeeting에 붙는다 (스키마 주석).
// 열람: 그 셀 셀장/부셀장 + 관리자. 작성: 셀장/부셀장만 (관리자는 댓글만 — 2026-09-10 확정).
@Injectable()
export class FollowerNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(requesterId: string, cellId: string): Promise<FollowerNoteInfo[]> {
    await this.assertCanView(requesterId, cellId);

    const notes = await this.prisma.followerNote.findMany({
      where: { meeting: { cellId } },
      select: {
        id: true,
        answer1: true,
        answer2: true,
        answer3: true,
        createdAt: true,
        author: { select: { name: true } },
        meeting: { select: { service: { select: { date: true } } } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            parentId: true,
            author: { select: { name: true, isAdmin: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { meeting: { service: { date: 'desc' } } },
    });

    return notes.map((note) => {
      const meetingDate = note.meeting.service.date;
      return {
        id: note.id,
        dateLabel: toDateLabel(meetingDate),
        month: meetingDate.getUTCMonth() + 1,
        meetingLabel: `(${WEEKDAY_LABELS[meetingDate.getUTCDay()]}) 셀모임`,
        authorName: note.author.name,
        writtenDateLabel: toDayLabel(note.createdAt),
        createdAt: note.createdAt.toISOString(),
        answers: [note.answer1 ?? '', note.answer2 ?? '', note.answer3 ?? ''],
        comments: note.comments.map((comment) => ({
          id: comment.id,
          authorName: comment.author.name,
          dateLabel: toShortDateLabel(comment.createdAt),
          content: comment.content,
          isPastor: comment.author.isAdmin,
          parentId: comment.parentId,
        })),
      };
    });
  }

  // 노트 작성 — 셀모임(주간)당 1개. 예배 회차(WorshipService)·셀모임(CellMeeting) 행이
  // 없으면 만들어서 붙인다: 회차 관리 기능이 아직 없어서 노트가 먼저 날짜를 만든다
  // (회차 생성 기능이 생기면 "없으면 에러"로 조여야 한다 — 임시 처리).
  async create(
    requesterId: string,
    cellId: string,
    dto: CreateFollowerNoteDto,
  ): Promise<FollowerNoteInfo[]> {
    await this.assertIsCellLeader(requesterId, cellId);
    if (!dto.answers[0]?.trim()) {
      throw new BadRequestException('첫 문항(요즘 상황과 기도제목)은 필수입니다.');
    }

    const meetingDate = new Date(dto.meetingDate);
    await this.prisma.$transaction(async (tx) => {
      const service = await tx.worshipService.upsert({
        where: { date: meetingDate },
        update: {},
        create: { date: meetingDate, name: '주일예배' },
      });
      const meeting = await tx.cellMeeting.upsert({
        where: { cellId_serviceId: { cellId, serviceId: service.id } },
        update: {},
        create: { cellId, serviceId: service.id, createdById: requesterId },
      });

      const existing = await tx.followerNote.findUnique({
        where: { meetingId: meeting.id },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException('그 주 노트가 이미 작성돼 있어요.');
      }

      await tx.followerNote.create({
        data: {
          meetingId: meeting.id,
          authorId: requesterId,
          answer1: dto.answers[0] ?? null,
          answer2: dto.answers[1]?.trim() ? dto.answers[1] : null,
          answer3: dto.answers[2]?.trim() ? dto.answers[2] : null,
        },
      });
    });

    return this.findAll(requesterId, cellId);
  }

  // 노트 수정 — 답변만 바꾼다 (셀모임 날짜는 주간 보고의 정체성이라 수정 불가 —
  // 날짜를 바꾸려면 삭제 후 재작성). 권한은 작성과 동일.
  async update(
    requesterId: string,
    cellId: string,
    noteId: string,
    dto: UpdateFollowerNoteDto,
  ): Promise<FollowerNoteInfo[]> {
    await this.assertIsCellLeader(requesterId, cellId);
    if (!dto.answers[0]?.trim()) {
      throw new BadRequestException('첫 문항(요즘 상황과 기도제목)은 필수입니다.');
    }
    const note = await this.findNoteInCell(noteId, cellId);

    await this.prisma.followerNote.update({
      where: { id: note.id },
      data: {
        answer1: dto.answers[0],
        answer2: dto.answers[1]?.trim() ? dto.answers[1] : null,
        answer3: dto.answers[2]?.trim() ? dto.answers[2] : null,
      },
    });
    return this.findAll(requesterId, cellId);
  }

  // 노트 삭제 — 그 셀 셀장/부셀장만 (작성 권한과 동일). 댓글은 cascade로 같이 지워진다.
  async remove(
    requesterId: string,
    cellId: string,
    noteId: string,
  ): Promise<{ id: string }> {
    await this.assertIsCellLeader(requesterId, cellId);
    const note = await this.findNoteInCell(noteId, cellId);
    await this.prisma.followerNote.delete({ where: { id: note.id } });
    return { id: noteId };
  }

  // 댓글 작성 — 관리자(목사님 댓글) + 그 셀 셀장/부셀장(답글). isPastor는 저장하지 않고
  // 읽을 때 author.isAdmin으로 계산한다.
  async addComment(
    requesterId: string,
    cellId: string,
    noteId: string,
    dto: CreateFollowerNoteCommentDto,
  ): Promise<FollowerNoteInfo[]> {
    await this.assertCanView(requesterId, cellId);
    const note = await this.findNoteInCell(noteId, cellId);

    if (dto.parentId) {
      const parent = await this.prisma.followerNoteComment.findFirst({
        where: { id: dto.parentId, noteId: note.id },
        select: { parentId: true },
      });
      if (!parent) throw new BadRequestException('존재하지 않는 댓글입니다.');
      if (parent.parentId) {
        throw new BadRequestException('대댓글에는 답글을 달 수 없습니다.');
      }
    }

    await this.prisma.followerNoteComment.create({
      data: {
        noteId: note.id,
        authorId: requesterId,
        content: dto.content,
        parentId: dto.parentId ?? null,
      },
    });
    return this.findAll(requesterId, cellId);
  }

  private async findNoteInCell(noteId: string, cellId: string) {
    const note = await this.prisma.followerNote.findFirst({
      where: { id: noteId, meeting: { cellId } },
      select: { id: true },
    });
    if (!note) throw new NotFoundException('노트를 찾을 수 없습니다.');
    return note;
  }

  // 열람·댓글 권한: 관리자 또는 그 셀의 셀장/부셀장. 셀원·게스트는 못 본다 (케어 기록).
  private async assertCanView(requesterId: string, cellId: string) {
    const requester = await this.findRequester(requesterId, cellId);
    const isCellLeader = (requester?.cellMemberships.length ?? 0) > 0;
    if (!requester || (!requester.isAdmin && !isCellLeader)) {
      throw new ForbiddenException('셀장 또는 관리자만 볼 수 있습니다.');
    }
  }

  // 작성·삭제 권한: 그 셀의 셀장/부셀장만 — 관리자는 작성 불가 (댓글만).
  private async assertIsCellLeader(requesterId: string, cellId: string) {
    const requester = await this.findRequester(requesterId, cellId);
    if ((requester?.cellMemberships.length ?? 0) === 0) {
      throw new ForbiddenException('그 셀의 셀장만 작성할 수 있습니다.');
    }
  }

  private findRequester(requesterId: string, cellId: string) {
    return this.prisma.user.findUnique({
      where: { id: requesterId },
      select: {
        isAdmin: true,
        cellMemberships: {
          where: {
            cellId,
            endedAt: null,
            role: { in: ['LEADER', 'SUB_LEADER'] },
          },
          select: { id: true },
        },
      },
    });
  }
}
