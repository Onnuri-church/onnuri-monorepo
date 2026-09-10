import { Injectable } from '@nestjs/common';
import type {
  QtShareListItem,
  QtShareListResponse,
  QtShareMonth,
} from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

// 큐티 날짜는 @db.Date라 Prisma가 UTC 자정으로 돌려준다 — KST로 읽으면 하루 밀리므로
// 아래 포맷 함수들은 전부 UTC 기준으로 읽는다.
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toMonthValue(date: Date): string {
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}`;
}

// "2026.05" → "26년 5월"
function toMonthLabel(monthValue: string): string {
  const [year, month] = monthValue.split('.');
  return `${year.slice(2)}년 ${Number(month)}월`;
}

function toDateLabel(date: Date): string {
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`;
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // 큐티나눔 목록. 월 필터 항목도 함께 내려준다 — 앱이 월 목록을 직접 만들지 않게 하려는 것
  // (ARCHITECTURE.md App Responsibilities). 글이 없는 달은 선택지에 넣지 않는다.
  async findQtShares(month?: string): Promise<QtShareListResponse> {
    const months = await this.findMonths();
    // 요청한 달에 글이 없으면(또는 month 생략) 가장 최근 달을 보여준다.
    const selected =
      months.find((item) => item.value === month)?.value ?? months[0]?.value;
    if (!selected) return { months, selectedMonth: null, items: [] };

    const [year, monthOfYear] = selected.split('.').map(Number);
    const posts = await this.prisma.post.findMany({
      where: {
        board: 'QT_SHARE',
        deletedAt: null,
        eventDate: {
          gte: new Date(Date.UTC(year, monthOfYear - 1, 1)),
          lt: new Date(Date.UTC(year, monthOfYear, 1)),
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        eventDate: true,
        author: { select: { name: true } },
        _count: { select: { likes: true } },
      },
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    });

    const items: QtShareListItem[] = posts.map((post) => ({
      id: post.id,
      authorName: post.author.name,
      // eventDate는 큐티나눔 작성 시 항상 채운다(글쓰기 API도 같은 계약).
      dateLabel: post.eventDate ? toDateLabel(post.eventDate) : '',
      title: post.title ?? '',
      description: post.content,
      likeCount: post._count.likes,
    }));

    return { months, selectedMonth: selected, items };
  }

  // 월 목록은 전체 글의 날짜에서 뽑아야 해서 본문 없이 날짜만 따로 조회한다.
  private async findMonths(): Promise<QtShareMonth[]> {
    const dates = await this.prisma.post.findMany({
      where: { board: 'QT_SHARE', deletedAt: null, eventDate: { not: null } },
      select: { eventDate: true },
      orderBy: { eventDate: 'desc' },
    });

    const values = [...new Set(dates.map((row) => toMonthValue(row.eventDate!)))];
    return values.map((value) => ({ value, label: toMonthLabel(value) }));
  }
}
