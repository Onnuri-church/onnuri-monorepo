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

// mimetype → 확장자. 목록에 없는 형식은 받지 않는다 (이미지 전용 업로드).
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
};

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

    const extension = EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException('이미지 파일(jpg/png/webp/gif/heic)만 올릴 수 있어요.');
    }

    const now = new Date();
    const path = `images/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extension}`;

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

  private putObject(path: string, file: Express.Multer.File) {
    const { url, serviceRoleKey, bucket } = this.storage;
    return fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': file.mimetype,
      },
      body: new Uint8Array(file.buffer),
    });
  }

  private async createBucket() {
    const { url, serviceRoleKey, bucket } = this.storage;
    const response = await fetch(`${url}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      // 공개 버킷 — 앱이 인증 없이 <public URL>로 사진을 그리는 구조라서다.
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    });
    if (!response.ok && response.status !== 409) {
      this.logger.error(`bucket create failed: ${response.status} ${await response.text()}`);
    }
  }
}
