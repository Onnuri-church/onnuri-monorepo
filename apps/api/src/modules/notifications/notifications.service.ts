import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import type { NotificationInfo } from '@onnuri/shared';
import type { NotificationType } from '../../../generated/prisma';

import { isReviewViewer } from '../../common/review/review-scope';
import { PrismaService } from '../prisma/prisma.service';

// 설정 화면의 알림 토글과 1:1인 타입만 유저 설정으로 푸시를 거른다 — 여기 없는 타입
// (좋아요·소그룹 등)은 끌 수단이 없으므로 모두에게 보낸다. CHAT은 일반 메시지만 끌 수 있어
// (멘션·공지·투표 마감은 항상 전달) 보내는 쪽이 NotifyInput.pref로 직접 지정한다.
// 알림센터에는 꺼도 쌓인다
// (푸시만 조용해지는 것 — 기록까지 숨기면 나중에 놓친 걸 찾을 수 없다).
const PUSH_PREF_COLUMN = {
  SERMON_UPLOAD: 'notifySermonUpload',
  LIVE_START: 'notifyLiveWorship',
  QT_NEW: 'notifyQtNewPost',
  NOTICE: 'notifyNotice',
  BULLETIN: 'notifyBulletin',
  COMMENT: 'notifyComment',
  FOLLOWER_NOTE: 'notifyFollowerNote',
} as const satisfies Partial<Record<NotificationType, string>>;

type PrefColumn =
  (typeof PUSH_PREF_COLUMN)[keyof typeof PUSH_PREF_COLUMN] | 'notifyChat';

// 다른 모듈이 이벤트 시점에 부르는 알림 생성 입력.
export interface NotifyInput {
  type: NotificationType;
  /** 알림센터 카드 상단 라벨 (예: "팔로워 노트") */
  title: string;
  body: string;
  /** 앱 내부 경로 ("notice/{id}" 등) — shared NotificationInfo.linkUrl 참고 */
  linkUrl?: string;
  /** 댓글 알림이면 그 댓글 — 앱이 상세에서 그 댓글로 스크롤해 강조한다 (SCRUM-215) */
  commentId?: string;
  /** 푸시를 거를 유저 설정 컬럼 — 없으면 타입별 기본(PUSH_PREF_COLUMN)을 쓴다 */
  pref?: PrefColumn;
}

// 푸시 영수증 확인 (SCRUM-266). Expo는 보낼 때 "접수증(ticket)"만 주고, 실제 전달 결과(영수증)는
// 잠시 뒤 따로 물어봐야 알려준다. 인증 키 누락(InvalidCredentials) 같은 실패는 영수증에만 나온다.
const RECEIPT_CHECK_INTERVAL_MS = 60 * 1000;
/** 접수 후 이만큼 지난 것부터 확인한다 — 너무 일찍 물으면 아직 결과가 없다 */
const RECEIPT_MIN_AGE_MS = 60 * 1000;
/** 이만큼 지나도록 결과가 없으면 버린다 */
const RECEIPT_MAX_AGE_MS = 30 * 60 * 1000;
/** 서버가 한 대라 메모리에 둔다 — 확인을 기다리는 접수증 상한 (넘으면 오래된 것부터 버린다) */
const PENDING_RECEIPT_LIMIT = 2000;

interface PushTicket {
  status: string;
  id?: string;
  message?: string;
  details?: { error?: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  /** 접수증 id → 보낸 토큰·시각. 영수증에서 죽은 토큰이 나오면 지우려고 토큰을 같이 둔다. */
  private readonly pendingReceipts = new Map<
    string,
    { token: string; sentAt: number }
  >();
  /** 기기 토큰이 없다고 이미 기록한 사용자 — 메시지마다 같은 줄이 쌓이지 않게 한 번만 남긴다 */
  private readonly loggedNoToken = new Set<string>();

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
        commentId: true,
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
      commentId: row.commentId,
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

  // 벨 아이콘 뱃지 — 켜짐/꺼짐만 필요하지만, 나중에 숫자 뱃지로 바꿀 수 있게 개수로 내린다.
  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  // 개별 지우기 — 내 알림만. 남의 id를 보내면 조건이 안 맞아 조용히 0건이다.
  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.notification.deleteMany({ where: { id, userId } });
  }

  // 전체 지우기 — 알림센터 헤더의 "모두 지우기".
  async removeAll(userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({ where: { userId } });
  }

  // 오래된 알림 정리 — 어차피 목록은 최근 100건만 내려서 UX 변화 없이 비대화만 막는다.
  // 매일 새벽 4시(KST, 서버 UTC 19시)에 30일 지난 행을 지운다.
  @Cron('0 19 * * *')
  async pruneOld(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleted = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (deleted.count > 0)
      this.logger.log(`오래된 알림 ${deleted.count}건 정리`);
  }

  // 알림 생성 — 실패해도 본 동작(공지 등록 등)을 막으면 안 되므로 절대 던지지 않는다
  // (UploadsService.deleteByUrl과 같은 취급). 알림센터 행을 쌓은 뒤 같은 내용으로
  // 기기 푸시도 발송한다.
  async notify(recipientIds: string[], input: NotifyInput): Promise<void> {
    if (recipientIds.length === 0) return;
    try {
      const userIds = await this.excludeRealUsersForReviewer(recipientIds);
      if (userIds.length === 0) return;
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          linkUrl: input.linkUrl ?? null,
          commentId: input.commentId ?? null,
        })),
      });
      await this.sendPush(userIds, input);
    } catch (error) {
      this.logger.warn(`notification create failed: ${String(error)}`);
    }
  }

  // 푸시만 보내고 알림센터에는 쌓지 않는다 — 단톡방 일반 메시지처럼 건수가 많아 센터를
  // 어지럽히는 알림용. notify와 같이 절대 던지지 않는다.
  async pushOnly(recipientIds: string[], input: NotifyInput): Promise<void> {
    if (recipientIds.length === 0) return;
    try {
      const userIds = await this.excludeRealUsersForReviewer(recipientIds);
      if (userIds.length === 0) return;
      await this.sendPush(userIds, input);
    } catch (error) {
      this.logger.warn(`push send failed: ${String(error)}`);
    }
  }

  // 심사 계정이 한 행동(댓글·소그룹 신청 등)으로는 실제 성도에게 알림을 보내지 않는다 (SCRUM-197) —
  // 심사 계정끼리만 받는다. 실제 성도가 한 행동은 그대로 모두에게 간다.
  private async excludeRealUsersForReviewer(userIds: string[]) {
    if (!isReviewViewer()) return userIds;
    const reviewers = await this.prisma.user.findMany({
      where: { id: { in: userIds }, isReviewAccount: true },
      select: { id: true },
    });
    return reviewers.map((user) => user.id);
  }

  // Expo 푸시 발송. 수신자들의 기기 토큰을 모아 100개 단위로 Expo 푸시 서버에 보낸다
  // (https://docs.expo.dev/push-notifications/sending-notifications/ — 요청당 100개 제한).
  // 앱을 지운 기기의 토큰(DeviceNotRegistered)은 그 자리에서 정리한다.
  private async sendPush(userIds: string[], input: NotifyInput): Promise<void> {
    // 설정 토글이 있는 타입이면 꺼둔 사람을 뺀다.
    let targetIds = userIds;
    const prefColumn: PrefColumn | undefined =
      input.pref ??
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
      select: { token: true, userId: true },
    });
    // 기기 토큰이 없는 사람은 푸시가 갈 곳이 없다 — 알림 권한을 안 켰거나 등록에 실패한 기기다.
    // "왜 알림이 안 오지"를 추적할 수 있게 사용자당 한 번만 기록한다 (SCRUM-266).
    const withToken = new Set(tokens.map((row) => row.userId));
    for (const userId of targetIds) {
      if (withToken.has(userId) || this.loggedNoToken.has(userId)) continue;
      this.loggedNoToken.add(userId);
      this.logger.warn(`push skipped: 등록된 기기가 없는 사용자 ${userId}`);
    }
    if (tokens.length === 0) return;

    const messages = tokens.map(({ token }) => ({
      to: token,
      // 기기 푸시 제목은 브랜드로 통일한다 (2026-10-07 결정) — 내용이 자체 설명적이라
      // 종류 제목은 중복이다. input.title은 앱 알림센터의 카드 라벨로만 쓰인다.
      title: '온누리 청년부',
      body: input.body,
      sound: 'default',
      // 앱이 푸시 탭을 받으면 알림센터를 연다 — linkUrl은 이후 딥링크 확장용으로 같이 싣는다.
      data: {
        linkUrl: input.linkUrl ?? null,
        commentId: input.commentId ?? null,
      },
    }));

    for (let start = 0; start < messages.length; start += 100) {
      const chunk = messages.slice(start, start + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        this.logger.warn(
          `push send failed: ${response.status} ${await response.text()}`,
        );
        continue;
      }

      // 티켓은 요청 순서와 1:1 대응 — 죽은 토큰만 골라 지운다.
      const { data: tickets } = (await response.json()) as {
        data?: PushTicket[];
      };
      const deadTokens: string[] = [];
      const now = Date.now();
      (tickets ?? []).forEach((ticket, index) => {
        const token = chunk[index].to;
        if (ticket.status === 'ok') {
          // 실제 전달 결과는 영수증으로 나중에 확인한다 (checkPushReceipts).
          if (ticket.id) this.rememberReceipt(ticket.id, token, now);
          return;
        }
        if (ticket.details?.error === 'DeviceNotRegistered') {
          deadTokens.push(token);
          return;
        }
        // 그 밖의 접수 실패는 예전엔 버려져서 원인을 알 수 없었다 (SCRUM-266).
        this.logger.warn(
          `push ticket error: ${ticket.details?.error ?? 'unknown'} — ${ticket.message ?? ''}`,
        );
      });
      await this.deleteTokens(deadTokens);
    }
  }

  private rememberReceipt(id: string, token: string, sentAt: number) {
    if (this.pendingReceipts.size >= PENDING_RECEIPT_LIMIT) {
      // Map은 넣은 순서를 지킨다 — 맨 앞이 가장 오래된 접수증이다.
      const oldest = this.pendingReceipts.keys().next().value;
      if (oldest !== undefined) this.pendingReceipts.delete(oldest);
    }
    this.pendingReceipts.set(id, { token, sentAt });
  }

  private async deleteTokens(tokens: string[]) {
    if (tokens.length === 0) return;
    await this.prisma.pushToken.deleteMany({
      where: { token: { in: tokens } },
    });
  }

  // 보낸 푸시의 실제 전달 결과를 확인한다 (SCRUM-266). 실패 사유를 기록하고, 앱이 지워진 기기의
  // 토큰은 정리한다. 알림 발송과 같이 절대 던지지 않는다.
  // https://docs.expo.dev/push-notifications/sending-notifications/#push-receipts
  @Interval(RECEIPT_CHECK_INTERVAL_MS)
  async checkPushReceipts(): Promise<void> {
    if (this.pendingReceipts.size === 0) return;
    const now = Date.now();
    const due: string[] = [];
    for (const [id, entry] of this.pendingReceipts) {
      const age = now - entry.sentAt;
      if (age > RECEIPT_MAX_AGE_MS) this.pendingReceipts.delete(id);
      else if (age >= RECEIPT_MIN_AGE_MS) due.push(id);
    }

    try {
      // 요청당 1000개 제한 — 넘는 건 다음 주기에 본다.
      for (let start = 0; start < due.length; start += 1000) {
        const ids = due.slice(start, start + 1000);
        const response = await fetch(
          'https://exp.host/--/api/v2/push/getReceipts',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          },
        );
        if (!response.ok) {
          this.logger.warn(`push receipt check failed: ${response.status}`);
          return;
        }
        const { data: receipts } = (await response.json()) as {
          data?: Record<string, PushTicket>;
        };
        const deadTokens: string[] = [];
        const errorCounts = new Map<
          string,
          { count: number; message: string }
        >();
        for (const [id, receipt] of Object.entries(receipts ?? {})) {
          const entry = this.pendingReceipts.get(id);
          this.pendingReceipts.delete(id);
          if (receipt.status === 'ok') continue;
          const code = receipt.details?.error ?? 'unknown';
          if (code === 'DeviceNotRegistered' && entry) {
            deadTokens.push(entry.token);
            continue;
          }
          const seen = errorCounts.get(code);
          if (seen) seen.count += 1;
          else
            errorCounts.set(code, { count: 1, message: receipt.message ?? '' });
        }
        for (const [code, { count, message }] of errorCounts) {
          this.logger.warn(
            `push delivery failed: ${code} ${count}건 — ${message}`,
          );
        }
        await this.deleteTokens(deadTokens);
      }
    } catch (error) {
      this.logger.warn(`push receipt check failed: ${String(error)}`);
    }
  }
}
