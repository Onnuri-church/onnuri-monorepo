import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminDownloadPreview } from '@onnuri/shared';
import * as ExcelJS from 'exceljs';

import { pad } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { FindAdminDownloadDto } from './dto/find-admin-download.dto';

// 그 기간의 일요일들 — @db.Date가 UTC 자정이라 UTC 기준 (출석부 집계와 동일).
function sundaysInRange(from: Date, to: Date): Date[] {
  const sundays: Date[] = [];
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  while (date <= to) {
    sundays.push(new Date(date));
    date.setUTCDate(date.getUTCDate() + 7);
  }
  return sundays;
}

// "25.03~25.08" — 셀 기간 표기 (docs/attendance-data-model.md §4.3). 진행 중이면 "현재".
function toPeriodLabel(startedAt: Date, endedAt: Date | null): string {
  const part = (date: Date) =>
    `${String(date.getUTCFullYear()).slice(2)}.${pad(date.getUTCMonth() + 1)}`;
  return `${part(startedAt)}~${endedAt ? part(endedAt) : '현재'}`;
}

const PREVIEW_ROWS = 10;

type DownloadUser = Awaited<ReturnType<AdminDownloadService['findUsers']>>[number];

interface AttendanceRow {
  userId: string;
  name: string;
  cellLabel: string;
  roleLabel: string;
  periodLabel: string;
  marks: string[];
  worshipOnly: number;
  meetingOnly: number;
  both: number;
  worshipTotal: number;
  meetingTotal: number;
  weekTotal: number;
}

// 데이터 다운로드 (관리자 전용) — attendance-data-model.md §4의 시트 2장을 그대로 만든다.
// 통계(나이·참석 횟수)는 저장하지 않고 뽑을 때 계산한다 (§5 저장 원칙).
@Injectable()
export class AdminDownloadService {
  constructor(private readonly prisma: PrismaService) {}

  async build(dto: FindAdminDownloadDto): Promise<Buffer> {
    const { from, to } = await this.resolveRange(dto);
    const users = await this.findUsers(dto, from, to);

    const workbook = new ExcelJS.Workbook();
    if (dto.kind !== 'attendance') {
      this.addMemberSheet(workbook, users);
    }
    if (dto.kind !== 'member') {
      await this.addAttendanceSheet(workbook, users, from, to);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async resolveRange(dto: FindAdminDownloadDto) {
    const year = new Date().getFullYear();
    if (dto.period === 'thisYear' || dto.period === undefined) {
      return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year, 11, 31)) };
    }
    if (dto.period === 'lastYear') {
      return {
        from: new Date(Date.UTC(year - 1, 0, 1)),
        to: new Date(Date.UTC(year - 1, 11, 31)),
      };
    }
    if (dto.period === 'custom') {
      if (!dto.from || !dto.to) {
        throw new BadRequestException('period=custom이면 from/to가 필요합니다.');
      }
      const from = new Date(dto.from);
      const to = new Date(dto.to);
      if (from > to) throw new BadRequestException('시작일이 종료일보다 늦습니다.');
      return { from, to };
    }
    // 전체: 첫 예배 회차부터 오늘까지 (기록이 없으면 올해).
    const first = await this.prisma.worshipService.findFirst({
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    return { from: first?.date ?? new Date(Date.UTC(year, 0, 1)), to: new Date() };
  }

  // 대상 회원 — 셀/팀 스코프는 기간과 겹치는 멤버십이 있던 사람들 (이력 포함).
  private async findUsers(dto: FindAdminDownloadDto, from: Date, to: Date) {
    const scope = dto.scope ?? 'all';
    if (scope !== 'all' && !dto.groupId) {
      throw new BadRequestException('scope가 cell/team이면 groupId가 필요합니다.');
    }
    const overlapping = { startedAt: { lte: to }, OR: [{ endedAt: null }, { endedAt: { gte: from } }] };

    const users = await this.prisma.user.findMany({
      where: {
        withdrawnAt: null,
        ...(scope === 'cell' && {
          cellMemberships: { some: { cellId: dto.groupId, ...overlapping } },
        }),
        ...(scope === 'team' && {
          teamMemberships: { some: { teamId: dto.groupId, ...overlapping } },
        }),
      },
      select: {
        id: true,
        name: true,
        birthDate: true,
        gender: true,
        teamMemberships: {
          where: { endedAt: null, team: { deletedAt: null } },
          select: { team: { select: { name: true } } },
        },
        cellMemberships: {
          where: overlapping,
          select: {
            role: true,
            startedAt: true,
            endedAt: true,
            cell: { select: { id: true, name: true, deletedAt: true } },
          },
          orderBy: { startedAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    if (scope !== 'all' && users.length === 0) {
      // 그룹 자체가 없는지 확인해서 더 정확한 에러를 준다.
      const exists =
        scope === 'cell'
          ? await this.prisma.cell.findUnique({ where: { id: dto.groupId }, select: { id: true } })
          : await this.prisma.team.findUnique({ where: { id: dto.groupId }, select: { id: true } });
      if (!exists) throw new NotFoundException('존재하지 않는 셀/팀입니다.');
    }
    return users;
  }

  // 시트 1 — 유저 정보 (§4.2): 유저ID / 이름 / 생년월일(나이) / 성별 / 소속 팀.
  private addMemberSheet(
    workbook: ExcelJS.Workbook,
    users: DownloadUser[],
  ) {
    const sheet = workbook.addWorksheet('유저 정보');
    sheet.addRow(['유저ID', '이름', '생년월일(나이)', '성별', '소속 팀']);
    sheet.getRow(1).font = { bold: true };

    const today = new Date();
    for (const user of users) {
      let birthLabel = '';
      if (user.birthDate) {
        const birth = user.birthDate;
        let age = today.getUTCFullYear() - birth.getUTCFullYear();
        const hadBirthday =
          today.getUTCMonth() > birth.getUTCMonth() ||
          (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
        if (!hadBirthday) age -= 1;
        birthLabel = `${birth.toISOString().slice(0, 10)} (${age})`;
      }
      sheet.addRow([
        user.id,
        user.name,
        birthLabel,
        user.gender ? (user.gender === 'MALE' ? '남' : '여') : '',
        user.teamMemberships[0]?.team.name ?? '',
      ]);
    }
  }

  // 시트 2 — 출석부 (§4.3): 셀 멤버십 기간별로 한 사람이 여러 줄. 날짜 칸 = "예배/셀모임",
  // 멤버십 기간 밖은 빈칸, 관리자가 지정한 모임 없는 날은 '-'. 끝 3칸은 예배만/셀모임만/둘다 횟수.
  private async addAttendanceSheet(
    workbook: ExcelJS.Workbook,
    users: DownloadUser[],
    from: Date,
    to: Date,
  ) {
    const sheet = workbook.addWorksheet('출석부');
    const { sundays, rows } = await this.buildAttendanceRows(users, from, to);
    sheet.addRow([
      '유저ID',
      '이름',
      '셀',
      '역할',
      '기간',
      ...sundays.map((s) => `${s.getUTCMonth() + 1}/${s.getUTCDate()}`),
      '예배만',
      '셀모임만',
      '둘다',
    ]);
    sheet.getRow(1).font = { bold: true };

    for (const row of rows) {
      sheet.addRow([
        row.userId,
        row.name,
        row.cellLabel,
        row.roleLabel,
        row.periodLabel,
        ...row.marks,
        row.worshipOnly,
        row.meetingOnly,
        row.both,
      ]);
    }
  }

  // 출석부 행 계산 — 엑셀 시트와 다운로드 전 미리보기가 같이 쓴다.
  private async buildAttendanceRows(users: DownloadUser[], from: Date, to: Date) {
    const sundays = sundaysInRange(from, to);
    const userIds = users.map((user) => user.id);
    const [services, offDays] = await Promise.all([
      this.prisma.worshipService.findMany({
        where: { date: { in: sundays } },
        select: {
          date: true,
          attendances: {
            where: { userId: { in: userIds } },
            select: { userId: true, attended: true },
          },
          cellMeetings: {
            select: {
              attendances: {
                where: { userId: { in: userIds } },
                select: { userId: true, attended: true },
              },
            },
          },
        },
      }),
      this.prisma.offDay.findMany({
        where: { date: { in: sundays } },
        select: { date: true, kind: true },
      }),
    ]);
    const worshipByKey = new Map<string, boolean>();
    const meetingByKey = new Map<string, boolean>();
    for (const service of services) {
      const week = String(service.date.getTime());
      for (const row of service.attendances) worshipByKey.set(`${week}:${row.userId}`, row.attended);
      for (const meeting of service.cellMeetings) {
        for (const row of meeting.attendances) meetingByKey.set(`${week}:${row.userId}`, row.attended);
      }
    }
    const offKindByWeek = new Map(offDays.map((offDay) => [String(offDay.date.getTime()), offDay.kind]));

    const rows: AttendanceRow[] = [];
    for (const user of users) {
      for (const membership of user.cellMemberships) {
        let worshipOnly = 0;
        let meetingOnly = 0;
        let both = 0;
        let worshipTotal = 0;
        let meetingTotal = 0;
        let weekTotal = 0;
        const marks = sundays.map((sunday) => {
          const inMembership =
            sunday >= membership.startedAt &&
            (membership.endedAt === null || sunday <= membership.endedAt);
          if (!inMembership) return '';
          const week = String(sunday.getTime());
          const offKind = offKindByWeek.get(week);
          const worship =
            offKind === 'WORSHIP_OFF' || offKind === 'BOTH_OFF'
              ? '-'
              : worshipByKey.get(`${week}:${user.id}`)
                ? 'O'
                : 'X';
          const meeting =
            offKind === 'CELL_MEETING_OFF' || offKind === 'BOTH_OFF'
              ? '-'
              : meetingByKey.get(`${week}:${user.id}`)
                ? 'O'
                : 'X';
          weekTotal += 1;
          if (worship === 'O') worshipTotal += 1;
          if (meeting === 'O') meetingTotal += 1;
          if (worship === 'O' && meeting === 'O') both += 1;
          else if (worship === 'O') worshipOnly += 1;
          else if (meeting === 'O') meetingOnly += 1;
          return `${worship}/${meeting}`;
        });

        rows.push({
          userId: user.id,
          name: user.name,
          // 삭제된 셀의 기록도 남는다 (2026-09-04 확정) — 표시만 구분
          cellLabel: membership.cell.deletedAt
            ? `${membership.cell.name} (삭제된 셀)`
            : membership.cell.name,
          roleLabel:
            membership.role === 'LEADER' ? '셀장' : membership.role === 'SUB_LEADER' ? '부셀장' : '셀원',
          periodLabel: toPeriodLabel(membership.startedAt, membership.endedAt),
          marks,
          worshipOnly,
          meetingOnly,
          both,
          worshipTotal,
          meetingTotal,
          weekTotal,
        });
      }
    }
    return { sundays, rows };
  }

  // 다운로드 전 미리보기 — 같은 조건으로 건수와 앞쪽 몇 줄만 보여준다. 연락처·생년월일은 싣지 않는다.
  async preview(dto: FindAdminDownloadDto): Promise<AdminDownloadPreview> {
    const { from, to } = await this.resolveRange(dto);
    const users = await this.findUsers(dto, from, to);
    const result: AdminDownloadPreview = {
      rangeLabel: `${from.toISOString().slice(0, 10)} ~ ${to.toISOString().slice(0, 10)}`,
      member: null,
      attendance: null,
    };

    if (dto.kind !== 'attendance') {
      result.member = {
        total: users.length,
        rows: users.slice(0, PREVIEW_ROWS).map((user) => ({
          name: user.name,
          gender: user.gender ? (user.gender === 'MALE' ? '남' : '여') : null,
          age: user.birthDate ? this.ageOf(user.birthDate) : null,
          team: user.teamMemberships[0]?.team.name ?? null,
          cell: user.cellMemberships.at(-1)?.cell.name ?? null,
        })),
      };
    }
    if (dto.kind !== 'member') {
      const { sundays, rows } = await this.buildAttendanceRows(users, from, to);
      result.attendance = {
        total: rows.length,
        weekCount: sundays.length,
        rows: rows.slice(0, PREVIEW_ROWS).map((row) => ({
          name: row.name,
          cell: row.cellLabel,
          role: row.roleLabel,
          period: row.periodLabel,
          worshipCount: row.worshipTotal,
          meetingCount: row.meetingTotal,
          weekTotal: row.weekTotal,
        })),
      };
    }
    return result;
  }

  private ageOf(birth: Date): number {
    const today = new Date();
    let age = today.getUTCFullYear() - birth.getUTCFullYear();
    const hadBirthday =
      today.getUTCMonth() > birth.getUTCMonth() ||
      (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
    if (!hadBirthday) age -= 1;
    return age;
  }
}
