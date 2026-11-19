import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { kstToday } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';

interface RouteBucket {
  hour: Date;
  method: string;
  route: string;
  count: number;
  errorCount: number;
  totalMs: number;
  maxMs: number;
}

const FLUSH_INTERVAL_MS = 60_000;

// 운영 지표 기록 (SCRUM-249·250). 요청마다 DB에 쓰지 않고 메모리에 모았다가 1분마다 한꺼번에 쓴다 —
// 지표 때문에 요청이 느려지거나, 지표 저장이 실패해 요청이 실패하는 일이 없게 한다.
// 서버가 한 대(Render 단일 인스턴스)라 메모리에 둔다 (RateLimitInterceptor와 같은 결).
// 서버가 내려갈 때 남은 것을 한 번 더 쓴다. 갑자기 죽으면 마지막 1분치는 잃는다 (지표라 감수한다).
@Injectable()
export class MetricsRecorderService implements OnModuleDestroy {
  private readonly logger = new Logger(MetricsRecorderService.name);
  private buckets = new Map<string, RouteBucket>();
  // 오늘 이미 기록한 사람 — 같은 사람을 하루에 한 번만 DB에 쓴다. 날짜가 바뀌면 비운다.
  private seenDate = '';
  private seenUsers = new Set<string>();
  private pendingActivity: { userId: string; date: Date }[] = [];

  constructor(private readonly prisma: PrismaService) {}

  recordRequest(
    method: string,
    route: string,
    status: number,
    durationMs: number,
  ): void {
    const hour = new Date();
    hour.setUTCMinutes(0, 0, 0);
    const key = `${hour.getTime()}|${method}|${route}`;
    const bucket = this.buckets.get(key) ?? {
      hour,
      method,
      route,
      count: 0,
      errorCount: 0,
      totalMs: 0,
      maxMs: 0,
    };
    bucket.count += 1;
    if (status >= 500) bucket.errorCount += 1;
    bucket.totalMs += durationMs;
    bucket.maxMs = Math.max(bucket.maxMs, durationMs);
    this.buckets.set(key, bucket);
  }

  recordActivity(userId: string): void {
    const date = kstToday();
    const dateKey = date.toISOString();
    if (dateKey !== this.seenDate) {
      this.seenDate = dateKey;
      this.seenUsers = new Set();
    }
    if (this.seenUsers.has(userId)) return;
    this.seenUsers.add(userId);
    this.pendingActivity.push({ userId, date });
  }

  @Interval(FLUSH_INTERVAL_MS)
  async flush(): Promise<void> {
    const activity = this.pendingActivity;
    const buckets = [...this.buckets.values()];
    this.pendingActivity = [];
    this.buckets = new Map();
    try {
      if (activity.length > 0) {
        // 서버가 다시 켜지면 '오늘 기록한 사람'을 잊으므로 같은 줄이 또 올 수 있다 — 겹치면 건너뛴다.
        await this.prisma.userActivityDay.createMany({
          data: activity,
          skipDuplicates: true,
        });
      }
      for (const bucket of buckets) {
        await this.prisma.apiRequestStat.upsert({
          where: {
            hour_method_route: {
              hour: bucket.hour,
              method: bucket.method,
              route: bucket.route,
            },
          },
          create: bucket,
          update: {
            count: { increment: bucket.count },
            errorCount: { increment: bucket.errorCount },
            totalMs: { increment: bucket.totalMs },
            // 이미 저장된 최댓값보다 클 때만 올려야 하지만, 한 번의 upsert로는 비교할 수 없어
            // 아래에서 따로 맞춘다.
          },
        });
        await this.prisma.apiRequestStat.updateMany({
          where: {
            hour: bucket.hour,
            method: bucket.method,
            route: bucket.route,
            maxMs: { lt: bucket.maxMs },
          },
          data: { maxMs: bucket.maxMs },
        });
      }
    } catch (error) {
      // 지표 저장 실패는 서비스에 영향을 주지 않는다 — 이번 묶음은 버리고 기록만 남긴다.
      this.logger.warn(`지표 저장 실패: ${String(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.flush();
  }
}
