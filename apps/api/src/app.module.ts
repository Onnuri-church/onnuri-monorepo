import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DedupeCreateInterceptor } from './common/interceptors/dedupe-create.interceptor';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { StorageUrlInterceptor } from './modules/uploads/storage-url.interceptor';
import { validate } from './config/env.validation';
import configuration from './config/configuration';
import { AdminModule } from './modules/admin/admin.module';
import { AppVersionModule } from './modules/app-version/app-version.module';
import { PublicPagesModule } from './modules/public-pages/public-pages.module';
import { AuthModule } from './modules/auth/auth.module';
import { BulletinsModule } from './modules/bulletins/bulletins.module';
import { CellsModule } from './modules/cells/cells.module';
import { GroupMeetingsModule } from './modules/group-meetings/group-meetings.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { NoticesModule } from './modules/notices/notices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PostsModule } from './modules/posts/posts.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SermonsModule } from './modules/sermons/sermons.module';
import { ChatModule } from './modules/chat/chat.module';
import { TeamBoardModule } from './modules/team-board/team-board.module';
import { TeamsModule } from './modules/teams/teams.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    SentryModule.forRoot(),
    // 설교영상 유튜브 동기화(SermonSyncService) 주기 실행용
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    CellsModule,
    TeamsModule,
    ChatModule,
    TeamBoardModule,
    GroupMeetingsModule,
    PostsModule,
    UploadsModule,
    AdminModule,
    NoticesModule,
    NotificationsModule,
    AttendanceModule,
    SermonsModule,
    BulletinsModule,
    AppVersionModule,
    PublicPagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 예외를 Sentry로 보낸 뒤 Nest 기본 예외 처리에 그대로 위임한다 (응답 모양 불변).
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    // 요청 횟수 제한 (SCRUM-165) — 중복 방지보다 먼저 돌아서 넘친 요청은 바로 429로 끝낸다.
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
    // 사진 링크 서명 (SCRUM-167) — 응답의 저장소 공개 주소 → 서명 링크, 요청의 서명 링크 → 공개 주소.
    // 중복 방지보다 바깥에 둬서, 기억해 둔 응답도 다시 내보낼 때마다 새로 서명한다.
    { provide: APP_INTERCEPTOR, useClass: StorageUrlInterceptor },
    // 만들기 POST의 재시도 중복 방지 (@DedupeCreate가 붙은 핸들러만 동작).
    { provide: APP_INTERCEPTOR, useClass: DedupeCreateInterceptor },
  ],
})
export class AppModule {}
