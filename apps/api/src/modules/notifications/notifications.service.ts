import { Injectable, Logger } from '@nestjs/common';
import type { NotificationInfo } from '@onnuri/shared';
import type { NotificationType } from '../../../generated/prisma';

import { PrismaService } from '../prisma/prisma.service';

// 다른 모듈이 이벤트 시점에 부르는 알림 생성 입력.
export interface NotifyInput {
  type: NotificationType;
  /** 알림센터 카드 상단 라벨 (예: "팔로워 노트") */
  title: string;
  body: string;
  /** 앱 내부 경로 ("notice/{id}" 등) — shared NotificationInfo.linkUrl 참고 */
  linkUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 내 알림 — 최신순. 알림은 계속 쌓이므로 최근 100건만 내린다 (페이지네이션은 필요해질 때).
  async findMine(userId: string): Promise<NotificationInfo[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        linkUrl: true,
        readAt: true,
        createdAt: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      linkUrl: row.linkUrl,
      isRead: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  // 전체 읽음 처리 — 알림센터를 열면 앱이 부른다 (행별 읽음은 시안에 없음).
  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // 알림 생성 — 실패해도 본 동작(공지 등록 등)을 막으면 안 되므로 절대 던지지 않는다
  // (UploadsService.deleteByUrl과 같은 취급).
  async notify(userIds: string[], input: NotifyInput): Promise<void> {
    if (userIds.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          linkUrl: input.linkUrl ?? null,
        })),
      });
    } catch (error) {
      this.logger.warn(`notification create failed: ${String(error)}`);
    }
  }
}
