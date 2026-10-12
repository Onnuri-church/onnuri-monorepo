import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AppConfig } from '../../config/configuration';

// 업로드 종류별 허용 형식·크기. 목록에 없는 형식은 받지 않는다.
// 사진은 폰 카메라 원본도 들어오게 10MB, 동영상은 50MB, 문서·악보 파일은 10MB.
const MB = 1024 * 1024;
type UploadKind = 'images' | 'videos' | 'files';
const ALLOWED: Record<string, { kind: UploadKind; extension: string }> = {
  'image/jpeg': { kind: 'images', extension: 'jpg' },
  'image/png': { kind: 'images', extension: 'png' },
  'image/webp': { kind: 'images', extension: 'webp' },
  'image/gif': { kind: 'images', extension: 'gif' },
  'image/heic': { kind: 'images', extension: 'heic' },
  'video/mp4': { kind: 'videos', extension: 'mp4' },
  'video/quicktime': { kind: 'videos', extension: 'mov' },
  'video/3gpp': { kind: 'videos', extension: '3gp' },
  'video/webm': { kind: 'videos', extension: 'webm' },
  'application/pdf': { kind: 'files', extension: 'pdf' },
  'application/msword': { kind: 'files', extension: 'doc' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    kind: 'files',
    extension: 'docx',
  },
  'application/vnd.ms-excel': { kind: 'files', extension: 'xls' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    kind: 'files',
    extension: 'xlsx',
  },
  'application/vnd.ms-powerpoint': { kind: 'files', extension: 'ppt' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    kind: 'files',
    extension: 'pptx',
  },
  'application/x-hwp': { kind: 'files', extension: 'hwp' },
  'application/haansofthwp': { kind: 'files', extension: 'hwp' },
  'application/vnd.hancom.hwp': { kind: 'files', extension: 'hwp' },
  'text/plain': { kind: 'files', extension: 'txt' },
};
const MAX_BYTES: Record<UploadKind, number> = {
  images: 10 * MB,
  videos: 50 * MB,
  files: 10 * MB,
};
// 컨트롤러의 multer 한도 — 종류별 한도 중 가장 큰 값. 종류별 상세 검사는 서비스가 한다.
export const MAX_UPLOAD_BYTES = 50 * MB;

// 이미지 업로드 — 공용 Supabase의 Storage에 넣고 공개 URL을 돌려준다.
// 파일은 서버를 경유시킨다: 인증·형식·크기 제한을 한 곳에서 걸기 위해서다 (앱이
// 스토리지 키를 갖지 않게 하는 목적도 있다). 버킷이 없으면 public으로 자동 생성한다.
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly storage: AppConfig['storage'];

  constructor(config: ConfigService<AppConfig, true>) {
    this.storage = config.get('storage', { infer: true });
  }

  async upload(file: Express.Multer.File): Promise<{ url: string }> {
    const { url, serviceRoleKey, bucket } = this.storage;
    if (!url || !serviceRoleKey) {
      throw new ServiceUnavailableException(
        '이미지 스토리지가 아직 설정되지 않았어요. SUPABASE_SERVICE_ROLE_KEY를 채워주세요.',
      );
    }

    const allowed = ALLOWED[file.mimetype];
    if (!allowed) {
      throw new BadRequestException(
        '사진(jpg/png/webp/gif/heic), 동영상(mp4/mov), 문서(pdf/doc/docx/xls/xlsx/ppt/pptx/hwp/txt) 파일만 올릴 수 있어요.',
      );
    }
    if (file.size > MAX_BYTES[allowed.kind]) {
      const limit = MAX_BYTES[allowed.kind] / MB;
      throw new BadRequestException(`이 종류의 파일은 ${limit}MB까지 올릴 수 있어요.`);
    }
    const extension = allowed.extension;

    const now = new Date();
    const path = `${allowed.kind}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extension}`;

    let response = await this.putObject(path, file);
    // 첫 업로드에서 버킷이 없으면 만들고 한 번 더 시도한다 — 팀원마다 버킷을 손으로
    // 만들지 않게 하려는 것 (이미 있으면 생성이 409로 떨어지므로 무시).
    if (response.status === 404 || response.status === 400) {
      await this.createBucket();
      response = await this.putObject(path, file);
    }
    if (!response.ok) {
      this.logger.error(`storage upload failed: ${response.status} ${await response.text()}`);
      throw new InternalServerErrorException('이미지 업로드에 실패했어요. 잠시 후 다시 시도해주세요.');
    }

    return { url: `${url}/storage/v1/object/public/${bucket}/${path}` };
  }

  // 우리 버킷의 공개 URL이면 창고에서 파일을 지운다 — 아바타 교체처럼 "이전 파일이 더는
  // 안 쓰이는 게 확실한" 자리에서 부른다. 실패해도 본 동작(교체)을 막지 않도록 예외를
  // 던지지 않고 경고만 남긴다 (파일이 남는 건 사용자에게 안 보이는 문제라서다).
  async deleteByUrl(fileUrl: string): Promise<void> {
    const { url, serviceRoleKey, bucket } = this.storage;
    if (!url || !serviceRoleKey) return;
    const publicPrefix = `${url}/storage/v1/object/public/${bucket}/`;
    // 외부 주소(개발 시드의 picsum 등)는 우리 창고가 아니므로 건드리지 않는다.
    if (!fileUrl.startsWith(publicPrefix)) return;
    const path = fileUrl.slice(publicPrefix.length);
    try {
      const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
        method: 'DELETE',
        headers: this.authHeaders(),
      });
      if (!response.ok && response.status !== 404) {
        this.logger.warn(`storage delete failed: ${response.status} ${await response.text()}`);
      }
    } catch (error) {
      this.logger.warn(`storage delete failed: ${String(error)}`);
    }
  }

  private putObject(path: string, file: Express.Multer.File) {
    const { url, bucket } = this.storage;
    return fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': file.mimetype },
      body: new Uint8Array(file.buffer),
    });
  }

  private async createBucket() {
    const { url, bucket } = this.storage;
    const response = await fetch(`${url}/storage/v1/bucket`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      // 공개 버킷 — 앱이 인증 없이 <public URL>로 사진을 그리는 구조라서다.
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    });
    if (!response.ok && response.status !== 409) {
      this.logger.error(`bucket create failed: ${response.status} ${await response.text()}`);
    }
  }

  // 키 형식이 두 세대다: 새 형식(sb_secret_…)은 apikey 헤더로, 옛 형식(JWT — 점 2개)은
  // Bearer로 보낸다. 새 키를 Bearer에 넣으면 "Invalid Compact JWS"로 거절된다 (실측).
  private authHeaders(): Record<string, string> {
    const key = this.storage.serviceRoleKey!;
    return key.includes('.')
      ? { Authorization: `Bearer ${key}` }
      : { apikey: key };
  }
}
