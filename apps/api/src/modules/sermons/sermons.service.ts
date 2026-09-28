import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  SermonListResponse,
  SermonMonth,
  SermonVideo,
} from '@onnuri/shared';

import {
  pad,
  toDateLabel,
  toMonthLabel,
  toMonthValue,
} from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';

const SERMON_SELECT = {
  id: true,
  title: true,
  passage: true,
  preacher: true,
  videoUrl: true,
  thumbnailUrl: true,
  isLive: true,
  viewCount: true,
  service: { select: { date: true, name: true, startsAt: true } },
} as const;

type SermonRow = {
  id: string;
  title: string;
  passage: string | null;
  preacher: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isLive: boolean;
  viewCount: number;
  service: { date: Date; name: string; startsAt: Date | null };
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const VIEW_COUNT_FORMAT = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

// "2026.08.30 (일) 오후 2:01" — 시각이 있는 값이라 KST로 옮겨 읽는다 (common/utils/date는 @db.Date 전용).
function toDateTimeLabel(at: Date): string {
  const kst = new Date(at.getTime() + 9 * 60 * 60 * 1000);
  const hour = kst.getUTCHours();
  const period = hour < 12 ? '오전' : '오후';
  return `${toDateLabel(kst)} (${WEEKDAYS[kst.getUTCDay()]}) ${period} ${hour % 12 || 12}:${pad(kst.getUTCMinutes())}`;
}

// 말씀 게시판 조회 — 게스트도 본다. 데이터는 SermonSyncService가 유튜브에서 채운다.
@Injectable()
export class SermonsService {
  constructor(private readonly prisma: PrismaService) {}

  private toVideo(row: SermonRow): SermonVideo {
    return {
      id: row.id,
      // 인입이 항상 watch?v= 형태로 채운다.
      videoId: row.videoUrl
        ? (new URL(row.videoUrl).searchParams.get('v') ?? '')
        : '',
      title: row.passage ? `${row.passage}ㅣ${row.title}` : row.title,
      preacher: row.preacher ?? '',
      date: toDateLabel(row.service.date),
      serviceName: row.service.name,
      dateTimeLabel: row.service.startsAt
        ? toDateTimeLabel(row.service.startsAt)
        : toDateLabel(row.service.date),
      thumbnailUrl: row.thumbnailUrl,
      viewCount: row.isLive ? VIEW_COUNT_FORMAT.format(row.viewCount) : null,
      isLive: row.isLive,
    };
  }

  async findSermons(month?: string): Promise<SermonListResponse> {
    const months = await this.findMonths();
    // 요청한 달에 영상이 없으면(또는 month 생략) 가장 최근 달을 보여준다.
    const selected =
      months.find((item) => item.value === month)?.value ?? months[0]?.value;
    if (!selected) return { months, selectedMonth: null, items: [] };

    const [year, monthOfYear] = selected.split('.').map(Number);
    const rows = await this.prisma.sermon.findMany({
      where: {
        deletedAt: null,
        service: {
          date: {
            gte: new Date(Date.UTC(year, monthOfYear - 1, 1)),
            lt: new Date(Date.UTC(year, monthOfYear, 1)),
          },
        },
      },
      select: SERMON_SELECT,
      orderBy: { service: { date: 'desc' } },
    });

    return {
      months,
      selectedMonth: selected,
      items: rows.map((row) => this.toVideo(row)),
    };
  }

  async findSermon(id: string): Promise<SermonVideo> {
    const row = await this.prisma.sermon.findFirst({
      where: { id, deletedAt: null },
      select: SERMON_SELECT,
    });
    if (!row) throw new NotFoundException('영상을 찾을 수 없습니다.');
    return this.toVideo(row);
  }

  private async findMonths(): Promise<SermonMonth[]> {
    const rows = await this.prisma.sermon.findMany({
      where: { deletedAt: null },
      select: { service: { select: { date: true } } },
      orderBy: { service: { date: 'desc' } },
    });

    const values = [
      ...new Set(rows.map((row) => toMonthValue(row.service.date))),
    ];
    return values.map((value) => ({ value, label: toMonthLabel(value) }));
  }
}
