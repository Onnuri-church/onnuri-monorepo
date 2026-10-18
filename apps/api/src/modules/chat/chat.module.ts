import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ChatController } from './chat.controller';
import { ChatRoomsController } from './chat-rooms.controller';
import { ChatRoomsService } from './chat-rooms.service';
import { ChatService } from './chat.service';
import { LeaderRoomsController } from './leader-rooms.controller';
import { LeaderRoomsService } from './leader-rooms.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ChatController, ChatRoomsController, LeaderRoomsController],
  providers: [ChatService, ChatRoomsService, LeaderRoomsService],
})
export class ChatModule {}
