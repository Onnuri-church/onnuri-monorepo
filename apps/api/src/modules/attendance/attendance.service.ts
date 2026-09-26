import { BadRequestException, Injectable } from '@nestjs/common';
import { ATTENDANCE_QR_CODE, type QrCheckInResponse } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

// QR 유효 시간 기본값 — 12:00 시작 ~ 14:30 마감 (2026-09-04 확정, KST).
// DATE 컬럼(UTC 자정) 기준으로 KST 12:00 = UTC 03:00, KST 14:30 = UTC 05:30.
const DEFAULT_OPEN_UTC_HOURS = 3;
const DEFAULT_CLOSE_UTC_HOURS = 5.5;
const HOUR = 60 * 60 * 1000;

// QR 예배 출석 — QR은 예배만 기록한다 (셀모임은 셀장이 출석 관리에서 체크, 2026-09-03 확정).
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
      throw new BadRequestException('출석 시간이 지났어요. QR 출석은 14시 30분까지예요.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        cellMemberships: {
          where: { endedAt: null, cell: { deletedAt: null } },
          select: { cell: { select: { name: true } } },
        },
      },
    });
    const cellName = user?.cellMemberships[0]?.cell.name ?? null;

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

    return {
      duplicate: false,
      userName: user?.name ?? '',
      serviceName: service.name,
      checkedAt: record.checkedAt.toISOString(),
      cellName,
    };
  }
}
