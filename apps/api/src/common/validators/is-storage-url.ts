import { registerDecorator, type ValidationOptions } from 'class-validator';

// 사진·파일 주소 칸에는 우리 저장소에 올린 파일 주소만 받는다 (SCRUM-190).
// 앱은 늘 업로드 API가 준 주소를 넣지만, 직접 요청하면 외부 사이트 주소도 넣을 수 있었다 —
// 그러면 그 화면을 연 다른 사람들의 앱이 외부 사이트로 요청을 보내게 된다(접속 IP 노출, 부적절한 이미지).
// 허용 접두어는 StorageUrlService가 설정에서 읽어 넣어 준다. 서명 링크는 이 검사 전에
// StorageUrlInterceptor가 저장용 공개 주소로 되돌려 놓는다.
let storagePublicPrefix: string | null = null;

export function setStoragePublicPrefix(prefix: string | null) {
  storagePublicPrefix = prefix;
}

export function isStorageUrl(value: unknown): boolean {
  if (value === null) return true; // "사진 지우기"는 null로 온다 — 필수 여부는 다른 데코레이터가 본다
  if (typeof value !== 'string') return false;
  // 저장소가 설정되지 않은 환경(업로드 자체가 503)에서는 https 주소면 받는다.
  if (!storagePublicPrefix) return value.startsWith('https://');
  const path = value.slice(storagePublicPrefix.length);
  return (
    value.startsWith(storagePublicPrefix) &&
    path.length > 0 &&
    !path.includes('..')
  );
}

export function IsStorageUrl(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isStorageUrl',
      target: object.constructor,
      propertyName,
      options: {
        message: '앱에서 올린 사진·파일만 쓸 수 있어요.',
        ...options,
      },
      validator: { validate: isStorageUrl },
    });
}
