import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 회원 관리 목록·셀장/부셀장 선택지 (관리자 전용). 'me' 라우트보다 뒤에 있어도
  // Nest는 정적 경로('me')를 파라미터 경로보다 먼저 매칭하므로 충돌하지 않는다.
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

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMyProfile(user.sub, dto);
  }
}
