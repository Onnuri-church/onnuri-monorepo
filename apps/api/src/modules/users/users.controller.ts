import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateAdminMemberDto } from './dto/update-admin-member.dto';
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

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMyProfile(user.sub, dto);
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
}
