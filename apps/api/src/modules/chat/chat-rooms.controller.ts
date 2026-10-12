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
import { ChatRoomsService } from './chat-rooms.service';
import {
  AddChatRoomMembersDto,
  CreateChatRoomDto,
  UpdateChatRoomDto,
} from './dto/chat-room.dto';

// 팀 단톡방 관리 — 만들기·이름 수정·멤버 추가/추방·삭제는 그 팀 팀장과 관리자 (검증은 서비스).
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatRoomsController {
  constructor(private readonly chatRoomsService: ChatRoomsService) {}

  @Get('teams/:teamId/chat-rooms')
  findByTeam(@CurrentUser() user: JwtPayload, @Param('teamId') teamId: string) {
    return this.chatRoomsService.findByTeam(user.sub, teamId);
  }

  @Post('teams/:teamId/chat-rooms')
  create(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Body() dto: CreateChatRoomDto,
  ) {
    return this.chatRoomsService.create(user.sub, teamId, dto);
  }

  @Get('chat-rooms/:roomId')
  findDetail(@CurrentUser() user: JwtPayload, @Param('roomId') roomId: string) {
    return this.chatRoomsService.findDetail(user.sub, roomId);
  }

  @Patch('chat-rooms/:roomId')
  rename(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateChatRoomDto,
  ) {
    return this.chatRoomsService.rename(user.sub, roomId, dto.name);
  }

  @Post('chat-rooms/:roomId/members')
  addMembers(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Body() dto: AddChatRoomMembersDto,
  ) {
    return this.chatRoomsService.addMembers(user.sub, roomId, dto.userIds);
  }

  @Delete('chat-rooms/:roomId/members/:memberId')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.chatRoomsService.removeMember(user.sub, roomId, memberId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('chat-rooms/:roomId')
  remove(@CurrentUser() user: JwtPayload, @Param('roomId') roomId: string) {
    return this.chatRoomsService.remove(user.sub, roomId);
  }
}
