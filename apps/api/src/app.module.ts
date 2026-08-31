import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './config/env.validation';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { GroupMeetingsModule } from './modules/group-meetings/group-meetings.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    SentryModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    GroupMeetingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 예외를 Sentry로 보낸 뒤 Nest 기본 예외 처리에 그대로 위임한다 (응답 모양 불변).
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
  ],
})
export class AppModule {}
