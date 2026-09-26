import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CellAttendanceResponse, CellRole } from '@onnuri/shared';

import type { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCellAttendanceDto } from './dto/save-cell-attendance.dto';

const ROLE_ORDER: Record<CellRole, number> = { LEADER: 0, SUB_LEADER: 1, MEMBER: 2 };

// 셀 출석 관리 — 확정 스펙(2026-09-03, docs/attendance-data-model.md): QR은 예배 출석만
// 자동 기록, 셀모임은 기본 결석이고 셀장이 온 사람만 체크한다. 이 화면의 저장은 수동
// 정정(MANUAL)으로 남는다. 열람·저장 권한: 그 셀 셀장/부셀장 + 관리자.
@Injectable()
export class CellAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    requesterId: string,
    cellId: string,
    date: string,
  ): Promise<CellAttendanceResponse> {
    await this.assertCanManage(requesterId, cellId);
    const members = await this.findActiveMembers(cellId);

    // 그 날짜의 예배 회차가 아직 없으면(QR도 저장도 없던 주) 전원 미기록으로 내려준다.
    const service = await this.prisma.worshipService.findUnique({
      where: { date: new Date(date) },
      select: {
        id: true,
        attendances: { select: { userId: true, attended: true } },
        cellMeetings: {
          where: { cellId },
          select: {
            attendances: { select: { userId: true, attended: true } },
          },
        },
      },
    });
    const worshipByUser = new Map(
      (service?.attendances ?? []).map((row) => [row.userId, row.attended]),
    );
    const meetingByUser = new Map(
      (service?.cellMeetings[0]?.attendances ?? []).map((row) => [
        row.userId,
        row.attended,
      ]),
    );

    return {
      date,
      members: members.map((member) => ({
        ...member,
        worship: worshipByUser.get(member.id) ?? false,
        meeting: meetingByUser.get(member.id) ?? false,
      })),
    };
  }

  // 등록하기 일괄 저장 — 예배는 기존 QR 기록과 다를 때만 수동(MANUAL) 정정으로 덮고,
  // 셀모임은 참석만 행으로 만든다(행 없음 = 불참, 스키마 주석).
  async save(
    requesterId: string,
    cellId: string,
    dto: SaveCellAttendanceDto,
  ): Promise<CellAttendanceResponse> {
    await this.assertCanManage(requesterId, cellId);
    const members = await this.findActiveMembers(cellId);
    const memberIds = new Set(members.map((member) => member.id));
    // 저장 직전에 셀을 나간 사람의 행이 섞여 들어오지 않게 현재 구성원 것만 반영한다.
    const records = dto.records.filter((record) => memberIds.has(record.userId));

    const meetingDate = new Date(dto.date);
    await this.prisma.$transaction(async (tx) => {
      // 예배 회차·셀모임 행이 없으면 만든다 — 회차 관리 기능 전 임시 처리 (팔로워 노트와 동일).
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

      for (const record of records) {
        await this.applyWorship(tx, service.id, requesterId, record);
        await this.applyMeeting(tx, meeting.id, requesterId, record);
      }
    });

    return this.find(requesterId, cellId, dto.date);
  }

  // 예배: 출석 → 행 upsert(attended true). 결석 → 기존 출석 행이 있을 때만 attended=false로
  // 정정(QR 오스캔 케이스 — 스키마 주석). 행이 없으면 결석이 기본이라 아무것도 안 한다.
  private async applyWorship(
    tx: Prisma.TransactionClient,
    serviceId: string,
    requesterId: string,
    record: { userId: string; worship: boolean },
  ) {
    const existing = await tx.worshipAttendance.findUnique({
      where: { serviceId_userId: { serviceId, userId: record.userId } },
      select: { attended: true },
    });
    if (record.worship) {
      if (existing?.attended) return; // QR로 이미 출석 — 기록 주체(QR)를 유지한다
      await tx.worshipAttendance.upsert({
        where: { serviceId_userId: { serviceId, userId: record.userId } },
        update: { attended: true, method: 'MANUAL', recordedById: requesterId },
        create: {
          serviceId,
          userId: record.userId,
          attended: true,
          method: 'MANUAL',
          recordedById: requesterId,
        },
      });
      return;
    }
    if (existing?.attended) {
      await tx.worshipAttendance.update({
        where: { serviceId_userId: { serviceId, userId: record.userId } },
        data: { attended: false, method: 'MANUAL', recordedById: requesterId },
      });
    }
  }

  // 셀모임: 참석 → 행 upsert. 불참 → 행 삭제 (행 없음 = 불참).
  private async applyMeeting(
    tx: Prisma.TransactionClient,
    meetingId: string,
    requesterId: string,
    record: { userId: string; meeting: boolean },
  ) {
    if (record.meeting) {
      await tx.cellMeetingAttendance.upsert({
        where: { meetingId_userId: { meetingId, userId: record.userId } },
        update: { attended: true, recordedById: requesterId },
        create: {
          meetingId,
          userId: record.userId,
          attended: true,
          recordedById: requesterId,
        },
      });
      return;
    }
    await tx.cellMeetingAttendance.deleteMany({
      where: { meetingId, userId: record.userId },
    });
  }

  private async findActiveMembers(cellId: string) {
    const cell = await this.prisma.cell.findFirst({
      where: { id: cellId, deletedAt: null },
      select: {
        memberships: {
          where: { endedAt: null },
          select: { role: true, user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    if (!cell) throw new NotFoundException('존재하지 않는 셀입니다.');

    return cell.memberships
      .map((m) => ({ id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl, role: m.role }))
      .sort(
        (a, b) =>
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          a.name.localeCompare(b.name, 'ko'),
      );
  }

  private async assertCanManage(requesterId: string, cellId: string) {
    const requester = await this.prisma.user.findUnique({
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
    const isCellLeader = (requester?.cellMemberships.length ?? 0) > 0;
    if (!requester || (!requester.isAdmin && !isCellLeader)) {
      throw new ForbiddenException('셀장 또는 관리자만 출석을 관리할 수 있습니다.');
    }
  }
}
