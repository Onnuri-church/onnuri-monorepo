import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { type AppConfig } from '../../config/configuration';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseSermonTitle } from './youtube-title';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
// 부산온누리교회 청년부 채널(UCOZOLIcsjvKYIk3TrzHGgVA)의 업로드 재생목록 — 채널 ID의 UC를 UU로 바꾼 값.
// search.list(100유닛) 대신 이걸 읽으면 한 번에 1유닛이라 5분 주기로 돌려도 일일 할당량(1만)에 한참 못 미친다.
const UPLOADS_PLAYLIST_ID = 'UUOZOLIcsjvKYIk3TrzHGgVA';
// 최근 업로드 한 페이지만 본다 — 매주 1~2개 올라오므로 5분 주기에서 놓칠 일이 없다.
const PAGE_SIZE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 제목의 예배일은 사람이 적는 값이라 틀릴 때가 있다 — 2026년 1월 영상들이 [25.01.04]처럼
// 연도를 전년도로 적어 올렸다. 방송 시작일(KST)과 일주일 넘게 차이 나면 제목이 틀린 것으로
// 보고 방송일을 쓴다. 며칠 뒤 다시 올린 영상은 제목 날짜가 맞으므로 그대로 둔다.
function correctServiceDate(titleDate: Date, startsAt: Date): Date {
  const kst = new Date(startsAt.getTime() + KST_OFFSET_MS);
  const broadcastDate = new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()),
  );
  const diff = Math.abs(broadcastDate.getTime() - titleDate.getTime());
  return diff > 7 * DAY_MS ? broadcastDate : titleDate;
}

interface PlaylistItemsResponse {
  items: { contentDetails: { videoId: string } }[];
}

interface VideosResponse {
  items: {
    id: string;
    snippet: {
      title: string;
      publishedAt: string;
      liveBroadcastContent: 'live' | 'upcoming' | 'none';
      thumbnails: { medium?: { url: string } };
    };
    statistics?: { viewCount?: string };
    liveStreamingDetails?: {
      actualStartTime?: string;
      concurrentViewers?: string;
    };
  }[];
}

// 말씀 게시판 영상 인입 — 교회 유튜브 채널을 주기적으로 읽어 Sermon/WorshipService에 반영한다.
// 앱에서 영상을 등록하는 기능은 없다. 라이브 여부·조회수도 매번 유튜브 값으로 덮어쓴다.
@Injectable()
export class SermonSyncService {
  private readonly logger = new Logger(SermonSyncService.name);
  private readonly apiKey: string | null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.apiKey = config.get('youtube', { infer: true }).apiKey;
  }

  // 서버 안에서 돈다 — Render 무료 인스턴스는 잠들어 있는 동안 건너뛰지만, 출시 때 상시 가동으로
  // 올리면 정상 주기가 된다 (ARCHITECTURE.md Deployment).
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sync(): Promise<void> {
    if (!this.apiKey || this.running) return;
    this.running = true;
    try {
      await this.syncLatest(this.apiKey);
    } catch (error) {
      // 주기 작업이라 던져도 받을 곳이 없다 — 로그만 남기고 다음 주기에 다시 시도한다.
      this.logger.error('설교영상 동기화 실패', error);
    } finally {
      this.running = false;
    }
  }

  private async syncLatest(apiKey: string): Promise<void> {
    const playlist = await this.get<PlaylistItemsResponse>('playlistItems', {
      part: 'contentDetails',
      playlistId: UPLOADS_PLAYLIST_ID,
      maxResults: String(PAGE_SIZE),
      key: apiKey,
    });
    const ids = playlist.items.map((item) => item.contentDetails.videoId);
    if (ids.length === 0) return;

    const videos = await this.get<VideosResponse>('videos', {
      part: 'snippet,statistics,liveStreamingDetails',
      id: ids.join(','),
      key: apiKey,
    });

    const sermons = videos.items
      // 예약만 걸린 방송은 아직 영상이 없다 — 시작하면 live로 바뀌어 다음 주기에 들어온다.
      .filter((video) => video.snippet.liveBroadcastContent !== 'upcoming')
      .flatMap((video) => {
        const parsed = parseSermonTitle(video.snippet.title);
        if (!parsed) return [];
        const isLive = video.snippet.liveBroadcastContent === 'live';
        const live = video.liveStreamingDetails;
        const startsAt = new Date(
          live?.actualStartTime ?? video.snippet.publishedAt,
        );
        return [
          {
            ...parsed,
            date: correctServiceDate(parsed.date, startsAt),
            videoId: video.id,
            startsAt,
            isLive,
            viewCount: Number(
              (isLive
                ? live?.concurrentViewers
                : video.statistics?.viewCount) ?? 0,
            ),
            thumbnailUrl: video.snippet.thumbnails.medium?.url ?? null,
          },
        ];
      })
      // 예배 하루에 설교 1건(Sermon.serviceId unique). 방송이 끊겨 다시 켠 날은 같은 날짜
      // 영상이 둘인데, 시작 순으로 덮어써서 나중 방송이 남게 한다.
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    for (const sermon of sermons) {
      // 회차 관리 기능 전이라 출석 쪽이 '주일예배'라는 임시 이름으로 만들어 둔 회차가 있다 —
      // 영상 제목의 예배명과 실제 방송 시작 시각으로 채운다.
      const service = await this.prisma.worshipService.upsert({
        where: { date: sermon.date },
        update: { name: sermon.serviceName, startsAt: sermon.startsAt },
        create: {
          date: sermon.date,
          name: sermon.serviceName,
          startsAt: sermon.startsAt,
        },
      });
      // 알림 전환 판단용 — upsert 전의 라이브 상태를 기억해 둔다.
      const existing = await this.prisma.sermon.findUnique({
        where: { serviceId: service.id },
        select: { isLive: true, deletedAt: true },
      });

      // deletedAt은 건드리지 않는다 — 관리자가 지운 영상이 다음 주기에 되살아나면 안 된다.
      const data = {
        title: sermon.title,
        passage: sermon.passage,
        preacher: sermon.preacher,
        videoUrl: `https://www.youtube.com/watch?v=${sermon.videoId}`,
        thumbnailUrl: sermon.thumbnailUrl,
        isLive: sermon.isLive,
        viewCount: sermon.viewCount,
      };
      const saved = await this.prisma.sermon.upsert({
        where: { serviceId: service.id },
        update: data,
        create: { serviceId: service.id, ...data },
        select: { id: true },
      });

      await this.notifyIfNeeded(sermon, existing, saved.id);
    }
  }

  // 설교 알림 — 설정 토글(실시간 예배 시작 / 말씀영상 업로드)과 1:1. 상태 전환에서만 보내서
  // 5분 주기가 반복돼도 같은 영상에 같은 종류는 한 번만 나간다.
  //  - 라이브 시작: 설교가 live로 처음 등장하거나 live로 바뀜
  //  - 영상 업로드: VOD로 처음 등장하거나, 라이브가 끝나 VOD가 됨(놓친 사람용 다시보기)
  private async notifyIfNeeded(
    sermon: { title: string; startsAt: Date; isLive: boolean },
    existing: { isLive: boolean; deletedAt: Date | null } | null,
    sermonId: string,
  ): Promise<void> {
    // 관리자가 지운 영상은 조용히 둔다. 첫 가동·빈 DB에 과거분이 쏟아질 때의
    // 알림 폭탄도 막는다 — 방송 시작 3일이 지난 영상은 새 소식이 아니다.
    if (existing?.deletedAt) return;
    if (Date.now() - sermon.startsAt.getTime() > 3 * DAY_MS) return;

    const liveStarted = sermon.isLive && (!existing || !existing.isLive);
    const uploaded = !sermon.isLive && (!existing || existing.isLive);
    if (!liveStarted && !uploaded) return;

    // 전 회원 대상 — 탈퇴자 제외 (공지와 같은 규칙). 토글을 끈 사람은
    // notifications.service가 푸시만 건너뛰고 알림센터에는 남긴다.
    const users = await this.prisma.user.findMany({
      where: { withdrawnAt: null },
      select: { id: true },
    });
    await this.notifications.notify(
      users.map((user) => user.id),
      liveStarted
        ? {
            type: 'LIVE_START',
            title: '실시간 예배',
            body: `실시간 예배가 시작됐어요: ${sermon.title}`,
            linkUrl: `sermon/${sermonId}`,
          }
        : {
            type: 'SERMON_UPLOAD',
            title: '말씀영상',
            body: `새 말씀영상이 올라왔어요: ${sermon.title}`,
            linkUrl: `sermon/${sermonId}`,
          },
    );
  }

  private async get<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const response = await fetch(
      `${YOUTUBE_API}/${path}?${new URLSearchParams(params).toString()}`,
    );
    if (!response.ok) {
      throw new Error(
        `YouTube API ${path} ${response.status}: ${await response.text()}`,
      );
    }
    return (await response.json()) as T;
  }
}
