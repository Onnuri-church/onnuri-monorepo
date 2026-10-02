import { Injectable, Logger } from '@nestjs/common';
import type { NotificationInfo } from '@onnuri/shared';
import type { NotificationType } from '../../../generated/prisma';

import { PrismaService } from '../prisma/prisma.service';

// 설정 화면의 알림 토글과 1:1인 타입만 유저 설정으로 푸시를 거른다 — 여기 없는 타입
// (공지·댓글 등)은 끌 수단이 없으므로 모두에게 보낸다. 알림센터에는 꺼도 쌓인다
// (푸시만 조용해지는 것 — 기록까지 숨기면 나중에 놓친 걸 찾을 수 없다).
const PUSH_PREF_COLUMN = {
  SERMON_UPLOAD: 'notifySermonUpload',
  LIVE_START: 'notifyLiveWorship',
  QT_NEW: 'notifyQtNewPost',
} as const satisfies Partial<Record<NotificationType, string>>;

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
  // (UploadsService.deleteByUrl과 같은 취급). 알림센터 행을 쌓은 뒤 같은 내용으로
  // 기기 푸시도 발송한다.
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
      await this.sendPush(userIds, input);
    } catch (error) {
      this.logger.warn(`notification create failed: ${String(error)}`);
    }
  }

  // Expo 푸시 발송. 수신자들의 기기 토큰을 모아 100개 단위로 Expo 푸시 서버에 보낸다
  // (https://docs.expo.dev/push-notifications/sending-notifications/ — 요청당 100개 제한).
  // 앱을 지운 기기의 토큰(DeviceNotRegistered)은 그 자리에서 정리한다.
  private async sendPush(userIds: string[], input: NotifyInput): Promise<void> {
    // 설정 토글이 있는 타입이면 꺼둔 사람을 뺀다.
    let targetIds = userIds;
    const prefColumn =
      PUSH_PREF_COLUMN[input.type as keyof typeof PUSH_PREF_COLUMN];
    if (prefColumn) {
      const allowed = await this.prisma.user.findMany({
        where: { id: { in: userIds }, [prefColumn]: true },
        select: { id: true },
      });
      targetIds = allowed.map((user) => user.id);
      if (targetIds.length === 0) return;
    }

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: targetIds } },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages = tokens.map(({ token }) => ({
      to: token,
      title: input.title,
      body: input.body,
      sound: 'default',
      // 앱이 푸시 탭을 받으면 알림센터를 연다 — linkUrl은 이후 딥링크 확장용으로 같이 싣는다.
      data: { linkUrl: input.linkUrl ?? null },
    }));

    for (let start = 0; start < messages.length; start += 100) {
      const chunk = messages.slice(start, start + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        this.logger.warn(`push send failed: ${response.status} ${await response.text()}`);
        continue;
      }

      // 티켓은 요청 순서와 1:1 대응 — 죽은 토큰만 골라 지운다.
      const { data: tickets } = (await response.json()) as {
        data?: { status: string; details?: { error?: string } }[];
      };
      const deadTokens = (tickets ?? []).flatMap((ticket, index) =>
        ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
          ? [chunk[index].to]
          : [],
      );
      if (deadTokens.length > 0) {
        await this.prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } });
      }
    }
  }
}
