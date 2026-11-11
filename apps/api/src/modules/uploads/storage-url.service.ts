import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AppConfig } from '../../config/configuration';

// 서명 링크 유효 시간. 같은 사진은 남은 시간이 절반 아래로 떨어질 때까지 같은 링크를 다시 쓴다 —
// 링크가 응답마다 바뀌면 앱의 이미지 캐시가 매번 새로 받아서다.
const SIGN_TTL_SEC = 12 * 60 * 60;
const REUSE_MIN_REMAINING_MS = (SIGN_TTL_SEC * 1000) / 2;
const CACHE_PURGE_THRESHOLD = 20000;

interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}

// 사진 저장소 비공개 (SCRUM-167).
// DB에는 지금처럼 공개 주소(…/object/public/<bucket>/<path>)를 "파일 이름표"로 저장해 두고,
// 앱에 내보낼 때만 잠깐 유효한 서명 링크(…/object/sign/<bucket>/<path>?token=…)로 바꾼다.
// 앱이 서명 링크를 그대로 돌려보내면(글 수정 등) 다시 공개 주소로 되돌려 저장한다.
// → DB 마이그레이션도, 앱 수정도 없이 버킷만 비공개로 돌리면 된다 (StorageUrlInterceptor가 한 곳에서 처리).
@Injectable()
export class StorageUrlService {
  private readonly logger = new Logger(StorageUrlService.name);
  private readonly storage: AppConfig['storage'];
  private readonly cache = new Map<string, CachedSignedUrl>();

  constructor(config: ConfigService<AppConfig, true>) {
    this.storage = config.get('storage', { infer: true });
  }

  get enabled(): boolean {
    return Boolean(this.storage.url && this.storage.serviceRoleKey);
  }

  /** 우리 버킷의 공개 주소 접두어 (DB에 저장되는 모양) */
  get publicPrefix(): string {
    return `${this.storage.url}/storage/v1/object/public/${this.storage.bucket}/`;
  }

  private get signedPrefix(): string {
    return `${this.storage.url}/storage/v1/object/sign/${this.storage.bucket}/`;
  }

  /** 앱이 돌려보낸 서명 링크를 저장용 공개 주소로 되돌린다. 다른 문자열은 그대로. */
  toCanonical(value: string): string {
    if (!this.enabled || !value.startsWith(this.signedPrefix)) return value;
    const path = value.slice(this.signedPrefix.length).split('?')[0];
    return `${this.publicPrefix}${path}`;
  }

  /** 공개 주소들을 서명 링크로 바꾼 표를 돌려준다. 서명에 실패한 주소는 표에 없다 (공개 주소 그대로 나간다). */
  async signPublicUrls(publicUrls: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!this.enabled || publicUrls.length === 0) return result;

    const now = Date.now();
    const missing: string[] = [];
    for (const publicUrl of new Set(publicUrls)) {
      const path = publicUrl.slice(this.publicPrefix.length);
      const cached = this.cache.get(path);
      if (cached && cached.expiresAt - now >= REUSE_MIN_REMAINING_MS) {
        result.set(publicUrl, cached.url);
      } else {
        missing.push(path);
      }
    }
    if (missing.length === 0) return result;

    try {
      const { url, bucket } = this.storage;
      const response = await fetch(`${url}/storage/v1/object/sign/${bucket}`, {
        method: 'POST',
        headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: SIGN_TTL_SEC, paths: missing }),
      });
      if (!response.ok) {
        this.logger.error(
          `storage sign failed: ${response.status} ${await response.text()}`,
        );
        return result;
      }
      const signed = (await response.json()) as {
        path: string | null;
        signedURL: string | null;
        error: string | null;
      }[];
      const expiresAt = now + SIGN_TTL_SEC * 1000;
      this.purgeExpired(now);
      for (const item of signed) {
        if (!item.path || !item.signedURL || item.error) continue;
        // signedURL은 "/object/sign/<bucket>/<path>?token=…" 꼴의 상대 경로다.
        const signedUrl = `${url}/storage/v1${item.signedURL}`;
        this.cache.set(item.path, { url: signedUrl, expiresAt });
        result.set(`${this.publicPrefix}${item.path}`, signedUrl);
      }
    } catch (error) {
      this.logger.error(`storage sign failed: ${String(error)}`);
    }
    return result;
  }

  private purgeExpired(now: number) {
    if (this.cache.size < CACHE_PURGE_THRESHOLD) return;
    for (const [path, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(path);
    }
  }

  // UploadsService와 같은 규칙 — 새 키(sb_secret_…)는 apikey, 옛 JWT 키는 Bearer.
  private authHeaders(): Record<string, string> {
    const key = this.storage.serviceRoleKey!;
    return key.includes('.')
      ? { Authorization: `Bearer ${key}` }
      : { apikey: key };
  }
}
