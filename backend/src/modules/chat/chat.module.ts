// backend/src/modules/chat/chat.module.ts

import { Module } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
