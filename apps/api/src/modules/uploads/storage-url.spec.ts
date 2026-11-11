import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, of } from 'rxjs';

import { StorageUrlInterceptor } from './storage-url.interceptor';
import { StorageUrlService } from './storage-url.service';

const BASE = 'https://ref.supabase.co';
const PUBLIC = `${BASE}/storage/v1/object/public/uploads/`;
const SIGNED = `${BASE}/storage/v1/object/sign/uploads/`;

const makeService = () =>
  new StorageUrlService({
    get: () => ({
      url: BASE,
      serviceRoleKey: 'sb_secret_test',
      bucket: 'uploads',
    }),
  } as unknown as ConfigService<never, true>);

const httpContext = (body: unknown) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ body }) }),
  }) as unknown as ExecutionContext;

describe('사진 링크 서명 (SCRUM-167)', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn((_url: string, init: { body: string }) => {
      const { paths } = JSON.parse(init.body) as { paths: string[] };
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            paths.map((path) => ({
              path,
              signedURL: `/object/sign/uploads/${path}?token=t-${path}`,
              error: null,
            })),
          ),
      });
    });
    global.fetch = fetchMock;
  });

  it('응답 안의 공개 주소를 한 번의 요청으로 모아 서명 링크로 바꾸고, 외부 주소는 그대로 둔다', async () => {
    const interceptor = new StorageUrlInterceptor(makeService());
    const data = {
      avatarUrl: `${PUBLIC}images/a.jpg`,
      items: [
        { cover: `${PUBLIC}images/b.png`, other: 'https://picsum.photos/1' },
      ],
      createdAt: new Date('2026-11-11'),
    };
    const handler: CallHandler = { handle: () => of(data) };
    const out = (await lastValueFrom(
      interceptor.intercept(httpContext({}), handler),
    )) as typeof data;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.avatarUrl).toBe(`${SIGNED}images/a.jpg?token=t-images/a.jpg`);
    expect(out.items[0].cover).toBe(
      `${SIGNED}images/b.png?token=t-images/b.png`,
    );
    expect(out.items[0].other).toBe('https://picsum.photos/1');
    expect(out.createdAt).toBeInstanceOf(Date);
    // 원본 응답 객체는 그대로 (중복 방지 인터셉터가 기억한 응답이 오염되지 않게)
    expect(data.avatarUrl).toBe(`${PUBLIC}images/a.jpg`);
  });

  it('같은 사진은 다시 서명하지 않고 같은 링크를 쓴다 (앱 이미지 캐시 유지)', async () => {
    const service = makeService();
    const first = await service.signPublicUrls([`${PUBLIC}images/a.jpg`]);
    const second = await service.signPublicUrls([`${PUBLIC}images/a.jpg`]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.get(`${PUBLIC}images/a.jpg`)).toBe(
      first.get(`${PUBLIC}images/a.jpg`),
    );
  });

  it('요청 본문의 서명 링크는 저장용 공개 주소로 되돌린다', async () => {
    const interceptor = new StorageUrlInterceptor(makeService());
    const body = {
      coverImageUrl: `${SIGNED}images/b.png?token=abc`,
      imageUrls: [
        `${SIGNED}images/c.jpg?token=def`,
        'https://example.com/x.jpg',
      ],
    };
    const request = { body };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of(null) }),
    );
    expect(request.body).toEqual({
      coverImageUrl: `${PUBLIC}images/b.png`,
      imageUrls: [`${PUBLIC}images/c.jpg`, 'https://example.com/x.jpg'],
    });
  });

  it('서명에 실패하면 공개 주소 그대로 내보낸다 (응답 자체는 깨지지 않는다)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('boom'),
    });
    const interceptor = new StorageUrlInterceptor(makeService());
    const out = await lastValueFrom(
      interceptor.intercept(httpContext({}), {
        handle: () => of({ url: `${PUBLIC}x.jpg` }),
      }),
    );
    expect(out).toEqual({ url: `${PUBLIC}x.jpg` });
  });
});
