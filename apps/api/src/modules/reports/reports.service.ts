import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminReportItem,
  ReportReason,
  ReportTargetType,
} from '@onnuri/shared';

import { NotificationsService } from '../notifications/notifications.service';
import { isSuspended } from '../../common/utils/suspension';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

// 알림 문구용 — shared의 REPORT_REASON_LABELS와 같은 값 (백엔드는 shared 런타임 값을 못 읽는다).
const REASON_LABELS: Record<ReportReason, string> = {
  ABUSE: '욕설·비방',
  SEXUAL: '음란·선정적인 내용',
  SPAM: '광고·도배',
  PRIVACY: '개인정보 노출',
  OTHER: '기타',
};

const SNAPSHOT_LENGTH = 300;

interface ReportTarget {
  authorId: string;
  text: string;
}

// 신고 (SCRUM-199). 앱스토어 UGC 요건 — 사용자가 부적절한 글을 신고하면 관리자에게 알림이 가고,
// 관리자는 관리자 화면에서 그 글을 숨기거나(작성자 삭제와 같은 soft delete) 문제없다고 넘긴다.
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto): Promise<void> {
    const target = await this.findTarget(dto.targetType, dto.targetId);
    if (!target) throw new NotFoundException('신고할 글을 찾을 수 없습니다.');
    if (target.authorId === reporterId) {
      throw new BadRequestException('내가 쓴 글은 신고할 수 없어요.');
    }

    const existing = await this.prisma.report.findUnique({
      where: {
        reporterId_targetType_targetId: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
      select: { id: true },
    });
    // 같은 글을 다시 신고하면 사유만 새로 받고 알림은 다시 보내지 않는다.
    if (existing) {
      await this.prisma.report.update({
        where: { id: existing.id },
        data: { reason: dto.reason, detail: dto.detail ?? null },
      });
      return;
    }

    await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetAuthorId: target.authorId,
        reason: dto.reason,
        detail: dto.detail ?? null,
        snapshot: target.text.slice(0, SNAPSHOT_LENGTH),
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { isAdmin: true, withdrawnAt: null },
      select: { id: true },
    });
    await this.notifications.notify(
      admins.map((admin) => admin.id),
      {
        type: 'REPORT',
        title: '신고',
        body: `새 신고가 접수됐어요 (${REASON_LABELS[dto.reason]})`,
        linkUrl: 'admin/reports',
      },
    );
  }

  // 관리자 목록 — 처리 전(open)은 오래된 순(먼저 온 것부터 처리), 처리됨(done)은 최근 처리 순.
  async findForAdmin(status: 'open' | 'done'): Promise<AdminReportItem[]> {
    const rows = await this.prisma.report.findMany({
      where:
        status === 'open'
          ? { status: 'OPEN' }
          : { status: { in: ['HIDDEN', 'DISMISSED'] } },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        detail: true,
        snapshot: true,
        status: true,
        createdAt: true,
        reporter: { select: { name: true } },
        targetAuthor: {
          select: { id: true, name: true, suspendedUntil: true },
        },
      },
      orderBy: status === 'open' ? { createdAt: 'asc' } : { handledAt: 'desc' },
      take: 100,
    });

    const openCounts = await this.prisma.report.groupBy({
      by: ['targetType', 'targetId'],
      where: { status: 'OPEN' },
      _count: { _all: true },
    });
    const countOf = (type: ReportTargetType, id: string) =>
      openCounts.find((c) => c.targetType === type && c.targetId === id)?._count
        ._all ?? 0;

    return rows.map((row) => ({
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      reason: row.reason,
      detail: row.detail,
      snapshot: row.snapshot,
      targetAuthorId: row.targetAuthor.id,
      targetAuthorName: row.targetAuthor.name,
      targetAuthorSuspended: isSuspended(row.targetAuthor.suspendedUntil),
      reporterName: row.reporter.name,
      openCountForTarget: countOf(row.targetType, row.targetId),
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  // 처리 — 같은 글에 들어온 처리 전 신고를 한꺼번에 닫는다. hide면 글을 soft delete 한다.
  async handle(
    adminId: string,
    reportId: string,
    action: 'hide' | 'dismiss',
  ): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { targetType: true, targetId: true },
    });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');

    if (action === 'hide') {
      await this.hideTarget(report.targetType, report.targetId);
    }
    await this.prisma.report.updateMany({
      where: {
        targetType: report.targetType,
        targetId: report.targetId,
        status: 'OPEN',
      },
      data: {
        status: action === 'hide' ? 'HIDDEN' : 'DISMISSED',
        handledAt: new Date(),
        handledById: adminId,
      },
    });
  }

  private async findTarget(
    type: ReportTargetType,
    id: string,
  ): Promise<ReportTarget | null> {
    const where = { id, deletedAt: null };
    switch (type) {
      case 'POST': {
        const post = await this.prisma.post.findFirst({
          where,
          select: { authorId: true, title: true, content: true },
        });
        return post
          ? {
              authorId: post.authorId,
              text: [post.title, post.content].filter(Boolean).join('\n'),
            }
          : null;
      }
      case 'COMMENT':
        return this.prisma.comment
          .findFirst({ where, select: { authorId: true, content: true } })
          .then((row) => row && { authorId: row.authorId, text: row.content });
      case 'CHAT_MESSAGE':
        return this.prisma.chatMessage
          .findFirst({ where, select: { authorId: true, content: true } })
          .then(
            (row) =>
              row && {
                authorId: row.authorId,
                text: row.content || '(사진·파일)',
              },
          );
      case 'TEAM_BOARD_POST':
        return this.prisma.teamBoardPost
          .findFirst({ where, select: { authorId: true, content: true } })
          .then((row) => row && { authorId: row.authorId, text: row.content });
      case 'TEAM_BOARD_COMMENT':
        return this.prisma.teamBoardComment
          .findFirst({ where, select: { authorId: true, content: true } })
          .then((row) => row && { authorId: row.authorId, text: row.content });
    }
  }

  private async hideTarget(type: ReportTargetType, id: string) {
    const data = { deletedAt: new Date() };
    const where = { id, deletedAt: null };
    switch (type) {
      case 'POST':
        await this.prisma.post.updateMany({ where, data });
        return;
      case 'COMMENT':
        await this.prisma.comment.updateMany({ where, data });
        return;
      case 'CHAT_MESSAGE':
        await this.prisma.chatMessage.updateMany({ where, data });
        return;
      case 'TEAM_BOARD_POST':
        await this.prisma.teamBoardPost.updateMany({ where, data });
        return;
      case 'TEAM_BOARD_COMMENT':
        await this.prisma.teamBoardComment.updateMany({ where, data });
        return;
    }
  }
}
