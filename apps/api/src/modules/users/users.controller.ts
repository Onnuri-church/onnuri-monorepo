import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateAdminMemberDto } from './dto/update-admin-member.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateMyAvatarDto } from './dto/update-my-avatar.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 회원 관리 목록·셀장/부셀장 선택지 (관리자 전용).
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  findAll() {
    return this.usersService.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.usersService.findMe(user.sub);
  }

  // 마이페이지 통계 카드 (큐티나눔·출석주수·기도제목).
  @UseGuards(JwtAuthGuard)
  @Get('me/stats')
  myStats(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMyStats(user.sub);
  }

  // 본인 탈퇴 (설정 > 회원탈퇴). soft 처리 — 글·댓글은 남는다 (관리자 탈퇴와 동일).
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  withdrawMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.withdrawMe(user.sub);
  }

  // 개인정보 동의 (필수·민감정보) — 동의 화면과 설정의 민감정보 토글이 부른다.
  @UseGuards(JwtAuthGuard)
  @Patch('me/consent')
  updateConsent(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateConsentDto,
  ) {
    return this.usersService.updateConsent(user.sub, dto);
  }

  // 동의 화면의 "동의하지 않고 나가기" — 막 가입한(동의·프로필 없는) 계정이면 지운다 (SCRUM-183).
  @UseGuards(JwtAuthGuard)
  @Post('me/consent/decline')
  @HttpCode(HttpStatus.OK)
  declineConsent(@CurrentUser() user: JwtPayload) {
    return this.usersService.declineConsent(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMyProfile(user.sub, dto);
  }

  // 프로필 사진만 따로 바꾼다 — PATCH me는 전체 필드 계약이라 사진 변경에 쓰기엔 무겁다.
  @UseGuards(JwtAuthGuard)
  @Patch('me/avatar')
  updateMyAvatar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMyAvatarDto,
  ) {
    return this.usersService.updateMyAvatar(user.sub, dto.avatarUrl);
  }

  // 알림 토글 3종 (설정 화면). 푸시 발송만 거르고 알림센터에는 그대로 쌓인다.
  @UseGuards(JwtAuthGuard)
  @Get('me/notification-settings')
  notificationSettings(@CurrentUser() user: JwtPayload) {
    return this.usersService.getNotificationSettings(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/notification-settings')
  updateNotificationSettings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.usersService.updateNotificationSettings(user.sub, dto);
  }

  // 기기 푸시 토큰 등록 — 로그인 후 권한을 허용한 기기가 부른다. 같은 기기에 다른 계정으로
  // 로그인하면 토큰 주인이 바뀐다 (서비스의 upsert 참고).
  @UseGuards(JwtAuthGuard)
  @Patch('me/push-token')
  registerPushToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.usersService.registerPushToken(user.sub, dto.token);
  }

  // 로그아웃하는 기기의 토큰 해제 — 안 지우면 로그아웃한 사람에게 푸시가 계속 간다.
  @UseGuards(JwtAuthGuard)
  @Delete('me/push-token')
  removePushToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.usersService.removePushToken(user.sub, dto.token);
  }

  // :id 라우트들은 'me'보다 뒤에 둔다 — Express는 등록 순서대로 매칭해서 앞에 두면
  // ':id'가 'me'를 회원 id로 먹는다. 전부 관리자 전용 (회원 관리 화면).
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findDetailForAdmin(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminMemberDto) {
    return this.usersService.updateByAdmin(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.withdrawByAdmin(id);
  }

  // 이용 정지·해제 (SCRUM-204) — 회원 상세와 신고 관리의 "작성자 이용 정지"가 부른다.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id/suspension')
  suspend(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.usersService.suspendByAdmin(user.sub, id, dto.days);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id/suspension')
  liftSuspension(@Param('id') id: string) {
    return this.usersService.liftSuspensionByAdmin(id);
  }
}
