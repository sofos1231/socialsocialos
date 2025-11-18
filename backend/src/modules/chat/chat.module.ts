import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../../db/prisma.module';
import { PracticeModule } from '../practice/practice.module';

@Module({
  imports: [PrismaModule, PracticeModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
