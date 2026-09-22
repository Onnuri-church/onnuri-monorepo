import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminAttendanceGroup,
  AdminAttendanceMark,
  AdminAttendanceResponse,
  AdminAttendanceRow,
  CellRole,
} from '@onnuri/shared';

import { pad } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { FindAdminAttendanceDto } from './dto/find-admin-attendance.dto';

const ROLE_ORDER: Record<CellRole, number> = { LEADER: 0, SUB_LEADER: 1, MEMBER: 2 };

// 그 달의 일요일들 — @db.Date가 UTC 자정으로 저장되므로 UTC 기준으로 만든다
// (조회 조건과 표 머리가 저장 값과 같은 기준이어야 하루씩 안 밀린다).
function sundaysOfMonth(year: number, month: number): Date[] {
  const sundays: Date[] = [];
  const date = new Date(Date.UTC(year, month - 1, 1));
  while (date.getUTCMonth() === month - 1) {
    if (date.getUTCDay() === 0) sundays.push(new Date(date));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return sundays;
}

interface MemberInfo {
  id: string;
  name: string;
  role: 'leader' | 'viceLeader' | null;
  roleLabel: string | null;
  /** 셀모임 표기를 계산할 소속 셀 (없으면 셀모임 칸이 전부 '-') */
  cellId: string | null;
}

// 관리자 출석부 — 셀 출석 관리(cell-attendance)가 기록한 값을 주차 × 회원 표로 집계한다.
// 표기 규칙(docs/attendance-data-model.md): 예배 O/X(행 없음=결석), 셀모임은 그 주 모임
// 행이 없으면 '-'(모임 없음 — 결석 아님).
@Injectable()
export class AdminAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async find(dto: FindAdminAttendanceDto): Promise<AdminAttendanceResponse> {
    const now = new Date();
    const month = dto.month ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const [year, monthOfYear] = month.split('-').map(Number);
    const sundays = sundaysOfMonth(year, monthOfYear);

    const groups = await this.findGroups(dto.scope ?? 'all', dto.groupId);
    const memberIds = groups.flatMap((group) => group.members.map((m) => m.id));
    const cellIds = [
      ...new Set(
        groups
          .flatMap((group) => group.members.map((m) => m.cellId))
          .filter((id): id is string => id !== null),
      ),
    ];

    // 그 달 예배 회차·예배 출석·셀모임(+출석)을 한 번에 긁어 맵으로 만든다.
    const services = await this.prisma.worshipService.findMany({
      where: { date: { in: sundays } },
      select: {
        id: true,
        date: true,
        attendances: {
          where: { userId: { in: memberIds } },
          select: { userId: true, attended: true },
        },
        cellMeetings: {
          where: { cellId: { in: cellIds } },
          select: {
            cellId: true,
            attendances: {
              where: { userId: { in: memberIds } },
              select: { userId: true, attended: true },
            },
          },
        },
      },
    });

    // 키: "시간값" / "시간값:userId" / "시간값:cellId" — 주차별 조회를 O(1)로.
    const worshipByKey = new Map<string, boolean>();
    const meetingExists = new Set<string>();
    const meetingByKey = new Map<string, boolean>();
    for (const service of services) {
      const week = String(service.date.getTime());
      for (const row of service.attendances) {
        worshipByKey.set(`${week}:${row.userId}`, row.attended);
      }
      for (const meeting of service.cellMeetings) {
        meetingExists.add(`${week}:${meeting.cellId}`);
        for (const row of meeting.attendances) {
          meetingByKey.set(`${week}:${row.userId}`, row.attended);
        }
      }
    }

    const toWeeks = (member: MemberInfo): [AdminAttendanceMark, AdminAttendanceMark][] =>
      sundays.map((sunday) => {
        const week = String(sunday.getTime());
        const worship: AdminAttendanceMark = worshipByKey.get(`${week}:${member.id}`)
          ? 'O'
          : 'X';
        const meeting: AdminAttendanceMark =
          member.cellId && meetingExists.has(`${week}:${member.cellId}`)
            ? meetingByKey.get(`${week}:${member.id}`)
              ? 'O'
              : 'X'
            : '-';
        return [worship, meeting];
      });

    return {
      month,
      monthLabel: `${year}년 ${monthOfYear}월`,
      dates: sundays.map(
        (sunday) => `${sunday.getUTCMonth() + 1}/${sunday.getUTCDate()}`,
      ),
      groups: groups.map(
        (group): AdminAttendanceGroup => ({
          id: group.id,
          name: group.name,
          rows: group.members.map(
            (member): AdminAttendanceRow => ({
              id: member.id,
              name: member.name,
              role: member.role,
              roleLabel: member.roleLabel,
              weeks: toWeeks(member),
            }),
          ),
        }),
      ),
    };
  }

  // 스코프별 그룹·구성원. 전체/특정 셀은 셀 단위(셀장→부셀장→이름순), 특정 팀은 팀원들
  // (각자 자기 소속 셀 기준으로 셀모임 칸을 계산한다).
  private async findGroups(
    scope: 'all' | 'cell' | 'team',
    groupId?: string,
  ): Promise<{ id: string; name: string; members: MemberInfo[] }[]> {
    if (scope !== 'all' && !groupId) {
      throw new BadRequestException('scope가 cell/team이면 groupId가 필요합니다.');
    }

    if (scope === 'team') {
      const team = await this.prisma.team.findFirst({
        where: { id: groupId, deletedAt: null },
        select: {
          id: true,
          name: true,
          memberships: {
            where: { endedAt: null },
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  cellMemberships: {
                    where: { endedAt: null, cell: { deletedAt: null } },
                    select: { cellId: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!team) throw new NotFoundException('존재하지 않는 팀입니다.');

      const members = team.memberships
        .map(
          (m): MemberInfo => ({
            id: m.user.id,
            name: m.user.name,
            role: m.role === 'LEADER' ? 'leader' : null,
            roleLabel: m.role === 'LEADER' ? '팀장' : null,
            cellId: m.user.cellMemberships[0]?.cellId ?? null,
          }),
        )
        .sort(
          (a, b) =>
            Number(b.role === 'leader') - Number(a.role === 'leader') ||
            a.name.localeCompare(b.name, 'ko'),
        );
      return [{ id: team.id, name: team.name, members }];
    }

    const cells = await this.prisma.cell.findMany({
      where: { deletedAt: null, ...(scope === 'cell' && { id: groupId }) },
      select: {
        id: true,
        name: true,
        memberships: {
          where: { endedAt: null },
          select: { role: true, user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    if (scope === 'cell' && cells.length === 0) {
      throw new NotFoundException('존재하지 않는 셀입니다.');
    }

    return cells.map((cell) => ({
      id: cell.id,
      name: cell.name,
      members: cell.memberships
        .map(
          (m): MemberInfo => ({
            id: m.user.id,
            name: m.user.name,
            role:
              m.role === 'LEADER'
                ? 'leader'
                : m.role === 'SUB_LEADER'
                  ? 'viceLeader'
                  : null,
            roleLabel:
              m.role === 'LEADER' ? '셀장' : m.role === 'SUB_LEADER' ? '부셀장' : null,
            cellId: cell.id,
          }),
        )
        .sort((a, b) => {
          const order = (member: MemberInfo) =>
            ROLE_ORDER[
              member.role === 'leader'
                ? 'LEADER'
                : member.role === 'viceLeader'
                  ? 'SUB_LEADER'
                  : 'MEMBER'
            ];
          return order(a) - order(b) || a.name.localeCompare(b.name, 'ko');
        }),
    }));
  }
}
