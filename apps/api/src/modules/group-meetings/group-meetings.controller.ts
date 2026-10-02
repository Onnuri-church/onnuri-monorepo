import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateGroupMeetingDto } from './dto/create-group-meeting.dto';
import { AddPhotosDto } from './dto/add-photos.dto';
import { DecideMemberDto } from './dto/decide-member.dto';
import { UpdateGroupMeetingDto } from './dto/update-group-meeting.dto';
import { GroupMeetingsService } from './group-meetings.service';

// 열람은 게스트도 된다 (게시판 열람 범위 — 셀 페이지와 같은 결). 생성은 관리자 전용
// (2026-09-21 관리자 시안), 수정·삭제·승인은 관리자/소그룹장 (검증은 서비스).
@Controller('group-meetings')
export class GroupMeetingsController {
  constructor(private readonly groupMeetingsService: GroupMeetingsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll() {
    return this.groupMeetingsService.findAll();
  }

  // 내가 신청·참여 중인 모임 (마이페이지 "취향 소그룹"). ':id'보다 먼저 둔다 — 등록 순서 매칭.
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.groupMeetingsService.findMine(user.sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id') id: string,
  ) {
    return this.groupMeetingsService.findOne(id, user?.sub);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupMeetingDto) {
    return this.groupMeetingsService.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGroupMeetingDto,
  ) {
    return this.groupMeetingsService.update(user.sub, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupMeetingsService.remove(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  join(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupMeetingsService.join(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/join')
  cancelJoin(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupMeetingsService.cancelJoin(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/photos')
  addPhotos(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddPhotosDto,
  ) {
    return this.groupMeetingsService.addPhotos(user.sub, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/photos/:imageId')
  removePhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.groupMeetingsService.removePhoto(user.sub, id, imageId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/members/:userId')
  decideMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: DecideMemberDto,
  ) {
    return this.groupMeetingsService.decideMember(user.sub, id, userId, dto.status);
  }
}
