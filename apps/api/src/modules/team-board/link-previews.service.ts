import { BadRequestException, Injectable } from '@nestjs/common';
import type { LinkPreview } from '@onnuri/shared';

// 링크 미리보기 — 유튜브 주소만 만든다. 유튜브가 공개하는 oEmbed 주소(고정 호스트)로 제목·썸네일을
// 받아 온다. 임의 주소를 서버가 가져오는 방식(SSRF 위험)은 쓰지 않는다.
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class LinkPreviewsService {
  private readonly cache = new Map<string, { at: number; value: LinkPreview | null }>();

  async find(rawUrl: string): Promise<LinkPreview | null> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('올바른 주소가 아니에요.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('http/https 주소만 쓸 수 있어요.');
    }
    // 미리보기를 지원하지 않는 주소는 오류가 아니라 "없음"이다 (앱은 링크만 보여준다).
    if (!YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return null;

    const cached = this.cache.get(parsed.href);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    let value: LinkPreview | null = null;
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(parsed.href)}`,
        { signal: AbortSignal.timeout(4000) },
      );
      if (response.ok) {
        const data = (await response.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        if (data.title) {
          value = {
            url: parsed.href,
            title: data.title,
            description: data.author_name ?? null,
            thumbnailUrl: data.thumbnail_url ?? null,
            domain: 'www.youtube.com',
          };
        }
      }
    } catch {
      // 네트워크 실패는 "없음"으로 취급한다 — 미리보기는 있으면 좋은 덤이다.
    }
    this.cache.set(parsed.href, { at: Date.now(), value });
    return value;
  }
}
