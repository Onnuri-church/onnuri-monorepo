import { Injectable } from '@nestjs/common';
import type { AdminMetricsResponse } from '@onnuri/shared';

import { kstToday, toKstDate } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// 운영 지표 조회 (SCRUM-249·250). 가입·글·댓글·채팅·소그룹·출석은 원래 테이블에 시각이 남아 있어
// 따로 로그를 쌓지 않고 그 자리에서 센다 (과거 날짜도 바로 나온다). 활성 사용자와 서버 요청만
// 기록 테이블(UserActivityDay, ApiRequestStat)에서 읽는다. 심사용 계정이 만든 것은 모두 뺀다.
// 회원이 수십 명 규모라 기간 안의 시각만 가져와 여기서 날짜별로 나눈다.
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(days: number): Promise<AdminMetricsResponse> {
    const today = kstToday(); // 한국 오늘의 UTC 자정
    const firstDay = new Date(today.getTime() - (days - 1) * DAY_MS);
    // 한국 날짜의 시작을 실제 시각으로 — createdAt처럼 시각이 있는 값과 비교할 때 쓴다.
    const since = new Date(firstDay.getTime() - KST_OFFSET_MS);
    const dates = Array.from({ length: days }, (_, index) =>
      ymd(new Date(firstDay.getTime() + index * DAY_MS)),
    );
    const real = { isReviewAccount: false };

    const [
      totalUsers,
      signups,
      posts,
      comments,
      chatMessages,
      hobbyGroups,
      attendances,
      activityRows,
      firstActivity,
      requestRows,
      firstRequest,
      routeRows,
    ] = await Promise.all([
      this.prisma.user.count({ where: { ...real, withdrawnAt: null } }),
      this.prisma.user.findMany({
        where: { ...real, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.post.findMany({
        where: { author: real, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.comment.findMany({
        where: { author: real, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.chatMessage.findMany({
        where: { author: real, isSystem: false, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.hobbyGroup.findMany({
        where: { isReviewOnly: false, post: { createdAt: { gte: since } } },
        select: { post: { select: { createdAt: true } } },
      }),
      this.prisma.worshipAttendance.findMany({
        where: { attended: true, user: real, checkedAt: { gte: since } },
        select: { checkedAt: true },
      }),
      this.prisma.userActivityDay.findMany({
        where: {
          date: { gte: new Date(today.getTime() - 29 * DAY_MS) },
        },
        select: { userId: true, date: true },
      }),
      this.prisma.userActivityDay.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
      this.prisma.apiRequestStat.findMany({
        where: { hour: { gte: since } },
        select: { hour: true, count: true, errorCount: true, totalMs: true },
      }),
      this.prisma.apiRequestStat.findFirst({
        orderBy: { hour: 'asc' },
        select: { hour: true },
      }),
      this.prisma.apiRequestStat.groupBy({
        by: ['method', 'route'],
        where: { hour: { gte: since } },
        _sum: { count: true, errorCount: true, totalMs: true },
        _max: { maxMs: true },
        orderBy: { _sum: { count: 'desc' } },
        take: 20,
      }),
    ]);

    // 시각 목록 → 한국 날짜별 개수
    const byDay = (times: Date[]) => {
      const counts = new Map<string, number>();
      for (const time of times) {
        const key = ymd(toKstDate(time));
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    };
    const signupCounts = byDay(signups.map((row) => row.createdAt));
    const contentCounts = {
      posts: byDay(posts.map((row) => row.createdAt)),
      comments: byDay(comments.map((row) => row.createdAt)),
      chatMessages: byDay(chatMessages.map((row) => row.createdAt)),
      hobbyGroups: byDay(hobbyGroups.map((row) => row.post.createdAt)),
      attendances: byDay(attendances.map((row) => row.checkedAt)),
    };
    const contentDaily = dates.map((date) => ({
      date,
      posts: contentCounts.posts.get(date) ?? 0,
      comments: contentCounts.comments.get(date) ?? 0,
      chatMessages: contentCounts.chatMessages.get(date) ?? 0,
      hobbyGroups: contentCounts.hobbyGroups.get(date) ?? 0,
      attendances: contentCounts.attendances.get(date) ?? 0,
    }));
    const sum = (key: keyof (typeof contentDaily)[number]) =>
      contentDaily.reduce((total, row) => total + (row[key] as number), 0);

    // 활성 사용자 — date는 @db.Date라 이미 한국 날짜의 UTC 자정이다.
    const activeByDay = new Map<string, number>();
    const weekStart = today.getTime() - 6 * DAY_MS;
    const weekUsers = new Set<string>();
    const monthUsers = new Set<string>();
    for (const row of activityRows) {
      const key = ymd(row.date);
      activeByDay.set(key, (activeByDay.get(key) ?? 0) + 1);
      monthUsers.add(row.userId);
      if (row.date.getTime() >= weekStart) weekUsers.add(row.userId);
    }

    // 서버 요청 — 시간대 줄을 한국 날짜별로 합친다.
    const requestByDay = new Map<
      string,
      { count: number; errorCount: number; totalMs: number }
    >();
    for (const row of requestRows) {
      const key = ymd(toKstDate(row.hour));
      const day = requestByDay.get(key) ?? {
        count: 0,
        errorCount: 0,
        totalMs: 0,
      };
      day.count += row.count;
      day.errorCount += row.errorCount;
      day.totalMs += row.totalMs;
      requestByDay.set(key, day);
    }
    const avg = (totalMs: number, count: number) =>
      count > 0 ? Math.round(totalMs / count) : 0;
    const requestDaily = dates.map((date) => {
      const day = requestByDay.get(date);
      return {
        date,
        count: day?.count ?? 0,
        errorCount: day?.errorCount ?? 0,
        avgMs: avg(day?.totalMs ?? 0, day?.count ?? 0),
      };
    });
    const requestTotal = requestRows.reduce((t, row) => t + row.count, 0);
    const requestTotalMs = requestRows.reduce((t, row) => t + row.totalMs, 0);

    return {
      days,
      users: {
        total: totalUsers,
        signups: dates.map((date) => ({
          date,
          count: signupCounts.get(date) ?? 0,
        })),
      },
      activity: {
        trackingSince: firstActivity ? ymd(firstActivity.date) : null,
        daily: dates.map((date) => ({
          date,
          count: activeByDay.get(date) ?? 0,
        })),
        wau: weekUsers.size,
        mau: monthUsers.size,
      },
      content: {
        daily: contentDaily,
        totals: {
          posts: sum('posts'),
          comments: sum('comments'),
          chatMessages: sum('chatMessages'),
          hobbyGroups: sum('hobbyGroups'),
          attendances: sum('attendances'),
        },
      },
      requests: {
        trackingSince: firstRequest ? ymd(toKstDate(firstRequest.hour)) : null,
        total: requestTotal,
        errorCount: requestRows.reduce((t, row) => t + row.errorCount, 0),
        avgMs: avg(requestTotalMs, requestTotal),
        daily: requestDaily,
        topRoutes: routeRows.map((row) => ({
          method: row.method,
          route: row.route,
          count: row._sum.count ?? 0,
          errorCount: row._sum.errorCount ?? 0,
          avgMs: avg(row._sum.totalMs ?? 0, row._sum.count ?? 0),
          maxMs: row._max.maxMs ?? 0,
        })),
      },
    };
  }
}
