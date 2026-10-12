import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ChatService } from './chat.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { SetChatNoticeDto } from './dto/set-chat-notice.dto';
import { ToggleChatReactionDto } from './dto/toggle-chat-reaction.dto';

// 팀 단톡방(/chat-rooms/:roomId/messages)과 셀 단톡방(/cells/:cellId/messages)이 같은 서비스를 쓴다.
// 접근 권한(그 방의 멤버·관리자)은 서비스가 검증한다.
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ---- 팀 단톡방 ----
  @Get('chat-rooms/:roomId/messages')
  findTeam(@CurrentUser() user: JwtPayload, @Param('roomId') roomId: string) {
    return this.chatService.find(user.sub, { roomId });
  }

  @Post('chat-rooms/:roomId/messages')
  sendTeam(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatService.send(user.sub, { roomId }, dto);
  }

  @Put('chat-rooms/:roomId/messages/:messageId/notice')
  setTeamNotice(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Body() dto: SetChatNoticeDto,
  ) {
    return this.chatService.setNotice(user.sub, { roomId }, messageId, dto.on);
  }

  @Put('chat-rooms/:roomId/messages/:messageId/reactions')
  reactTeam(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ToggleChatReactionDto,
  ) {
    return this.chatService.toggleReaction(user.sub, { roomId }, messageId, dto.emoji);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('chat-rooms/:roomId/messages/:messageId')
  removeTeam(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.remove(user.sub, { roomId }, messageId);
  }

  // ---- 셀 단톡방 ----
  @Get('cells/:cellId/messages')
  findCell(@CurrentUser() user: JwtPayload, @Param('cellId') cellId: string) {
    return this.chatService.find(user.sub, { cellId });
  }

  @Post('cells/:cellId/messages')
  sendCell(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatService.send(user.sub, { cellId }, dto);
  }

  @Put('cells/:cellId/messages/:messageId/notice')
  setCellNotice(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Param('messageId') messageId: string,
    @Body() dto: SetChatNoticeDto,
  ) {
    return this.chatService.setNotice(user.sub, { cellId }, messageId, dto.on);
  }

  @Put('cells/:cellId/messages/:messageId/reactions')
  reactCell(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ToggleChatReactionDto,
  ) {
    return this.chatService.toggleReaction(user.sub, { cellId }, messageId, dto.emoji);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('cells/:cellId/messages/:messageId')
  removeCell(
    @CurrentUser() user: JwtPayload,
    @Param('cellId') cellId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.remove(user.sub, { cellId }, messageId);
  }
}
