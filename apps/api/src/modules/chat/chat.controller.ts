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
import { AddChatPollOptionDto, VoteChatPollDto } from './dto/poll.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { SetChatNoticeDto } from './dto/set-chat-notice.dto';
import { ToggleChatReactionDto } from './dto/toggle-chat-reaction.dto';

// 팀 단톡방(/chat-rooms/:roomId/messages), 셀 단톡방(/cells/:cellId/messages), 취향소그룹 단톡방
// (/group-meetings/:groupId/messages)이 같은 서비스를 쓴다.
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

  // 읽음 표시 — 방을 열었을 때·열어 둔 채 새 메시지가 왔을 때 앱이 부른다.
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put('chat-rooms/:roomId/read')
  readTeam(@CurrentUser() user: JwtPayload, @Param('roomId') roomId: string) {
    return this.chatService.markRead(user.sub, { roomId });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put('cells/:cellId/read')
  readCell(@CurrentUser() user: JwtPayload, @Param('cellId') cellId: string) {
    return this.chatService.markRead(user.sub, { cellId });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put('group-meetings/:groupId/read')
  readGroup(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.chatService.markRead(user.sub, { groupId });
  }

  // 안 읽은 메시지 수 — 셀 페이지 헤더 아이콘·소그룹 입구의 빨간 점이 쓴다 (팀 방은 목록 응답에 같이 온다).
  @Get('cells/:cellId/unread')
  unreadCell(@CurrentUser() user: JwtPayload, @Param('cellId') cellId: string) {
    return this.chatService.unreadCount(user.sub, { cellId });
  }

  @Get('group-meetings/:groupId/unread')
  unreadGroup(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.chatService.unreadCount(user.sub, { groupId });
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

  // ---- 취향소그룹 단톡방 ----
  @Get('group-meetings/:groupId/messages')
  findGroup(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.chatService.find(user.sub, { groupId });
  }

  @Post('group-meetings/:groupId/messages')
  sendGroup(
    @CurrentUser() user: JwtPayload,
    @Param('groupId') groupId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatService.send(user.sub, { groupId }, dto);
  }

  @Put('group-meetings/:groupId/messages/:messageId/notice')
  setGroupNotice(
    @CurrentUser() user: JwtPayload,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: SetChatNoticeDto,
  ) {
    return this.chatService.setNotice(user.sub, { groupId }, messageId, dto.on);
  }

  @Put('group-meetings/:groupId/messages/:messageId/reactions')
  reactGroup(
    @CurrentUser() user: JwtPayload,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ToggleChatReactionDto,
  ) {
    return this.chatService.toggleReaction(user.sub, { groupId }, messageId, dto.emoji);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('group-meetings/:groupId/messages/:messageId')
  removeGroup(
    @CurrentUser() user: JwtPayload,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.remove(user.sub, { groupId }, messageId);
  }

  // ---- 투표 (방 종류와 무관 — 투표가 올라온 방의 접근 권한을 서비스가 확인한다) ----
  @Put('chat-polls/:pollId/votes')
  vote(
    @CurrentUser() user: JwtPayload,
    @Param('pollId') pollId: string,
    @Body() dto: VoteChatPollDto,
  ) {
    return this.chatService.votePoll(user.sub, pollId, dto.optionIds);
  }

  @Post('chat-polls/:pollId/options')
  addPollOption(
    @CurrentUser() user: JwtPayload,
    @Param('pollId') pollId: string,
    @Body() dto: AddChatPollOptionDto,
  ) {
    return this.chatService.addPollOption(user.sub, pollId, dto.text);
  }

  @Post('chat-polls/:pollId/close')
  closePoll(@CurrentUser() user: JwtPayload, @Param('pollId') pollId: string) {
    return this.chatService.closePoll(user.sub, pollId);
  }
}
