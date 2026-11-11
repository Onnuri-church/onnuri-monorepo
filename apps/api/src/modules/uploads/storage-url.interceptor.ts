import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Request } from 'express';
import { from, mergeMap, Observable } from 'rxjs';

import { StorageUrlService } from './storage-url.service';

// 응답 안의 우리 저장소 공개 주소를 서명 링크로, 요청 본문의 서명 링크를 공개 주소로 바꾼다 (SCRUM-167).
// 사진 주소가 들어가는 곳(아바타·커버·본문 사진·갤러리·단톡방 파일…)이 많아서 하나하나 고치지 않고
// 들어오고 나가는 JSON 전체를 한 번 훑는다. 한 응답의 주소는 한 번의 요청으로 모아서 서명한다.
@Injectable()
export class StorageUrlInterceptor implements NestInterceptor {
  constructor(private readonly storageUrls: StorageUrlService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !this.storageUrls.enabled)
      return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    if (request.body && typeof request.body === 'object') {
      request.body = mapStrings(request.body, (value) =>
        this.storageUrls.toCanonical(value),
      );
    }

    const prefix = this.storageUrls.publicPrefix;
    return next.handle().pipe(
      mergeMap((data) => {
        const found: string[] = [];
        mapStrings(data, (value) => {
          if (value.startsWith(prefix)) found.push(value);
          return value;
        });
        if (found.length === 0) return from([data]);
        return from(
          this.storageUrls
            .signPublicUrls(found)
            .then((signed) =>
              mapStrings(data, (value) => signed.get(value) ?? value),
            ),
        );
      }),
    );
  }
}

// JSON 모양 값의 모든 문자열에 fn을 적용한 새 값을 만든다 (원본은 건드리지 않는다 —
// 중복 방지 인터셉터가 기억해 둔 응답을 다시 내보낼 때 이미 바뀐 값이 섞이지 않게).
// 파일 응답·버퍼·날짜처럼 JSON 객체가 아닌 값은 그대로 둔다.
function mapStrings(value: unknown, fn: (value: string) => string): unknown {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, fn));
  if (
    value === null ||
    typeof value !== 'object' ||
    value instanceof Date ||
    value instanceof StreamableFile ||
    Buffer.isBuffer(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      mapStrings(item, fn),
    ]),
  );
}
