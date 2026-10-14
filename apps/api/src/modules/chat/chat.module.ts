import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ChatController } from './chat.controller';
import { ChatRoomsController } from './chat-rooms.controller';
import { ChatRoomsService } from './chat-rooms.service';
import { ChatService } from './chat.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ChatController, ChatRoomsController],
  providers: [ChatService, ChatRoomsService],
})
export class ChatModule {}
