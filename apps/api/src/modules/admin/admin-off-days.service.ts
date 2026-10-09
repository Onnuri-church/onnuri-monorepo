import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type {
  AdminOffDaysResponse,
  OffDayConflictBody,
  OffDayKind,
} from '@onnuri/shared';

import { pad } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { sundaysOfMonth } from './admin-attendance.service';
import { SetOffDayDto } from './dto/set-off-day.dto';

const toDateString = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

// 관리자가 지정하는 "모임 없는 날". 지정 없는 일요일은 예배·셀모임이 모두 있는 날이다.
// 지정하면 그 날의 해당 출석 기록은 삭제된다 (확인창에서 confirm을 받은 뒤에만).
// 셀모임 행(CellMeeting) 자체는 지우지 않는다 — 팔로워 노트가 매달려 있어서 출석 행만 정리한다.
@Injectable()
export class AdminOffDaysService {
  constructor(private readonly prisma: PrismaService) {}

  async find(month?: string): Promise<AdminOffDaysResponse> {
    const now = new Date();
    const target = month ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const [year, monthOfYear] = target.split('-').map(Number);
    const sundays = sundaysOfMonth(year, monthOfYear);

    const offDays = await this.prisma.offDay.findMany({
      where: { date: { in: sundays } },
      select: { date: true, kind: true },
    });
    const kindByTime = new Map(
      offDays.map((offDay) => [offDay.date.getTime(), offDay.kind]),
    );

    return {
      month: target,
      monthLabel: `${year}년 ${monthOfYear}월`,
      days: sundays.map((sunday) => ({
        date: toDateString(sunday),
        label: `${sunday.getUTCMonth() + 1}/${sunday.getUTCDate()}`,
        kind: kindByTime.get(sunday.getTime()) ?? null,
      })),
    };
  }

  async set(dateString: string, dto: SetOffDayDto): Promise<{ kind: OffDayKind | null }> {
    const date = new Date(dateString);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateString) ||
      Number.isNaN(date.getTime()) ||
      toDateString(date) !== dateString ||
      date.getUTCDay() !== 0
    ) {
      throw new BadRequestException('일요일 날짜(YYYY-MM-DD)만 지정할 수 있어요.');
    }
    const kind = dto.kind ?? null;

    if (kind === null) {
      await this.prisma.offDay.deleteMany({ where: { date } });
      return { kind: null };
    }

    const clearsWorship = kind === 'WORSHIP_OFF' || kind === 'BOTH_OFF';
    const clearsCell = kind === 'CELL_MEETING_OFF' || kind === 'BOTH_OFF';
    const worshipWhere = { service: { date } };
    const cellWhere = { meeting: { service: { date } } };

    // 지울 기록 수 — 결석(attended=false) 행은 정보가 없어서 세지 않지만 같이 정리한다.
    const [worshipCount, cellMeetingCount] = await Promise.all([
      clearsWorship
        ? this.prisma.worshipAttendance.count({ where: { ...worshipWhere, attended: true } })
        : 0,
      clearsCell
        ? this.prisma.cellMeetingAttendance.count({ where: { ...cellWhere, attended: true } })
        : 0,
    ]);
    if ((worshipCount > 0 || cellMeetingCount > 0) && !dto.confirm) {
      const body: OffDayConflictBody = {
        message: '이 날짜에 기존 출석 기록이 있어요. 지정하면 기록이 삭제돼요.',
        worshipCount,
        cellMeetingCount,
      };
      throw new ConflictException(body);
    }

    await this.prisma.$transaction([
      ...(clearsWorship ? [this.prisma.worshipAttendance.deleteMany({ where: worshipWhere })] : []),
      ...(clearsCell ? [this.prisma.cellMeetingAttendance.deleteMany({ where: cellWhere })] : []),
      this.prisma.offDay.upsert({
        where: { date },
        update: { kind },
        create: { date, kind },
      }),
    ]);
    return { kind };
  }
}
