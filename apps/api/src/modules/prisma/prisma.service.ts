import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      // DB가 아직 준비되지 않은 개발 초기 단계에서도 서버가 뜰 수 있도록 연결 실패를 넘어간다.
      // DB를 쓰는 요청(auth/users 등)은 실제로 호출될 때 에러가 난다.
      this.logger.warn(
        `데이터베이스에 연결하지 못했습니다. DB 없이 화면 작업만 하는 중이라면 무시해도 됩니다: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
