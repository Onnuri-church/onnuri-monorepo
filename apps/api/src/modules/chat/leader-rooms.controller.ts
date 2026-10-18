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
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  AddChatRoomMembersDto,
  CreateChatRoomDto,
  UpdateChatRoomDto,
} from './dto/chat-room.dto';
import { LeaderRoomsService } from './leader-rooms.service';

// 전체 리더 방 관리 — 목록·상세는 리더 등급(방 멤버)·관리자, 만들기·수정·멤버 관리·삭제는 관리자 (검증은 서비스).
// 대화 자체(메시지·공지·반응·읽음)는 ChatController의 leader-rooms/:roomId/… 주소가 맡는다.
// 요청 본문은 팀 단톡방과 같은 DTO를 쓴다 (이름 + 멤버 id 목록).
@UseGuards(JwtAuthGuard)
@Controller('leader-rooms')
export class LeaderRoomsController {
  constructor(private readonly leaderRoomsService: LeaderRoomsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.leaderRoomsService.findAll(user.sub);
  }

  // ':roomId'보다 먼저 선언해야 'candidates'가 방 id로 잡히지 않는다.
  @Get('candidates')
  findCandidates(@CurrentUser() user: JwtPayload) {
    return this.leaderRoomsService.findCandidates(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateChatRoomDto) {
    return this.leaderRoomsService.create(user.sub, dto.name, dto.memberIds);
  }

  @Get(':roomId')
  findDetail(@CurrentUser() user: JwtPayload, @Param('roomId') roomId: string) {
    return this.leaderRoomsService.findDetail(user.sub, roomId);
  }

  @Patch(':roomId')
  rename(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateChatRoomDto,
  ) {
    return this.leaderRoomsService.rename(user.sub, roomId, dto.name);
  }

  @Post(':roomId/members')
  addMembers(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Body() dto: AddChatRoomMembersDto,
  ) {
    return this.leaderRoomsService.addMembers(user.sub, roomId, dto.userIds);
  }

  @Delete(':roomId/members/:memberId')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.leaderRoomsService.removeMember(user.sub, roomId, memberId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':roomId')
  remove(@CurrentUser() user: JwtPayload, @Param('roomId') roomId: string) {
    return this.leaderRoomsService.remove(user.sub, roomId);
  }
}
