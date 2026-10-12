import { BadRequestException, Injectable } from '@nestjs/common';
import { ATTENDANCE_QR_CODE, type QrCheckInResponse } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

// QR 유효 시간 기본값 — 12:00 시작 ~ 17:00 마감 (마감은 2026-10-11에 14:30에서 연장, KST).
// DATE 컬럼(UTC 자정) 기준으로 KST 12:00 = UTC 03:00, KST 17:00 = UTC 08:00.
const DEFAULT_OPEN_UTC_HOURS = 3;
const DEFAULT_CLOSE_UTC_HOURS = 8;
const HOUR = 60 * 60 * 1000;

// QR 출석 — 예배와 셀모임을 함께 출석으로 기록한다 (2026-10-11 변경: 이전엔 예배만 기록).
// 셀모임은 예배는 왔지만 셀모임에 안 온 사람을 셀장이 출석 관리에서 결석으로 고친다.
@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(userId: string, code: string): Promise<QrCheckInResponse> {
    // 앱이 스캔 단계에서 선검증하지만, API 직접 호출을 막기 위해 서버도 재검증한다.
    if (code !== ATTENDANCE_QR_CODE) {
      throw new BadRequestException('유효하지 않은 QR 코드예요.');
    }

    // "오늘"은 KST 기준 — 서버(UTC)의 자정 무렵에 날짜가 밀리지 않게 9시간을 더해 계산한다.
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * HOUR);
    const todayStr = kstNow.toISOString().slice(0, 10);
    const today = new Date(todayStr);

    // 관리자가 예배 없는 날로 지정한 날은 QR 출석을 받지 않는다.
    const offDay = await this.prisma.offDay.findUnique({
      where: { date: today },
      select: { kind: true },
    });
    if (offDay?.kind === 'WORSHIP_OFF' || offDay?.kind === 'BOTH_OFF') {
      throw new BadRequestException('오늘은 예배 출석이 없는 날이에요.');
    }

    // 오늘 회차가 있으면 그 회차의 시간창을 따른다 — 다른 요일의 특별 예배도 회차만
    // 만들어두면 QR을 받을 수 있다. 없으면 주일(일요일)에만 기본값으로 자동 생성한다
    // (팔로워 노트·출석 저장의 upsert와 같은 임시 처리 — 회차 관리 기능이 생기면 조인다).
    let service = await this.prisma.worshipService.findUnique({
      where: { date: today },
      select: { id: true, name: true, qrOpensAt: true, qrClosesAt: true },
    });
    if (!service) {
      if (kstNow.getUTCDay() !== 0) {
        throw new BadRequestException('오늘은 예배 출석을 받는 날이 아니에요.');
      }
      service = await this.prisma.worshipService.create({
        data: {
          date: today,
          name: '주일예배',
          // 스키마 주석의 계약대로 회차 생성 시 기본 시간창을 세팅한다.
          qrOpensAt: new Date(today.getTime() + DEFAULT_OPEN_UTC_HOURS * HOUR),
          qrClosesAt: new Date(today.getTime() + DEFAULT_CLOSE_UTC_HOURS * HOUR),
        },
        select: { id: true, name: true, qrOpensAt: true, qrClosesAt: true },
      });
    }

    // 다른 경로(셀 출석 저장 등)로 만들어진 회차는 시간창이 비어 있을 수 있다 — 기본값으로 간주.
    const opensAt =
      service.qrOpensAt ?? new Date(today.getTime() + DEFAULT_OPEN_UTC_HOURS * HOUR);
    const closesAt =
      service.qrClosesAt ?? new Date(today.getTime() + DEFAULT_CLOSE_UTC_HOURS * HOUR);
    if (now < opensAt) {
      throw new BadRequestException('아직 출석 시간이 아니에요. 12시부터 스캔할 수 있어요.');
    }
    if (now > closesAt) {
      throw new BadRequestException('출석 시간이 지났어요. QR 출석은 17시까지예요.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        cellMemberships: {
          where: { endedAt: null, cell: { deletedAt: null } },
          select: { cellId: true, cell: { select: { name: true } } },
        },
      },
    });
    const cellName = user?.cellMemberships[0]?.cell.name ?? null;
    const cellId = user?.cellMemberships[0]?.cellId ?? null;

    // 이미 출석돼 있으면 그대로 알려준다 — attended=false(오스캔 정정)였다면 다시 출석 처리.
    const existing = await this.prisma.worshipAttendance.findUnique({
      where: { serviceId_userId: { serviceId: service.id, userId } },
      select: { id: true, attended: true, checkedAt: true },
    });
    if (existing?.attended) {
      return {
        duplicate: true,
        userName: user?.name ?? '',
        serviceName: service.name,
        checkedAt: existing.checkedAt.toISOString(),
        cellName,
      };
    }

    const record = existing
      ? await this.prisma.worshipAttendance.update({
          where: { id: existing.id },
          data: { attended: true, method: 'QR', checkedAt: now },
          select: { checkedAt: true },
        })
      : await this.prisma.worshipAttendance.create({
          data: { serviceId: service.id, userId, method: 'QR' },
          select: { checkedAt: true },
        });

    // 셀모임 출석도 같이 기록한다 — 관리자가 셀모임 없는 날로 지정한 날, 셀이 없는 사람은 건너뛴다.
    // 셀장이 이미 결석으로 고친(행 삭제) 사람이 다시 스캔하는 경우는 위 duplicate 분기에서 걸러진다.
    const skipMeeting = offDay?.kind === 'CELL_MEETING_OFF';
    if (cellId && !skipMeeting) {
      const meeting = await this.prisma.cellMeeting.upsert({
        where: { cellId_serviceId: { cellId, serviceId: service.id } },
        update: {},
        create: { cellId, serviceId: service.id },
        select: { id: true },
      });
      await this.prisma.cellMeetingAttendance.upsert({
        where: { meetingId_userId: { meetingId: meeting.id, userId } },
        update: {},
        create: {
          meetingId: meeting.id,
          userId,
          attended: true,
          // 기록 주체가 셀장이 아니라 QR 본인이다 — 셀장이 출석 관리에서 고치면 그 사람으로 바뀐다.
          recordedById: userId,
        },
      });
    }

    return {
      duplicate: false,
      userName: user?.name ?? '',
      serviceName: service.name,
      checkedAt: record.checkedAt.toISOString(),
      cellName,
    };
  }
}
