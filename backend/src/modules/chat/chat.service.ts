// backend/src/modules/chat/chat.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async handleUserMessage(userId: string, sessionId: string, content: string) {
    const text = (content ?? '').trim();
    if (!userId || !sessionId) {
      throw new BadRequestException({
        code: 'CHAT_BAD_REQUEST',
        message: 'Missing userId or sessionId',
      });
    }
    if (!text) {
      throw new BadRequestException({
        code: 'CHAT_EMPTY_MESSAGE',
        message: 'Message content is empty',
      });
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        userId,
        sessionId,
        role: MessageRole.USER,
        content: text,
      },
    });

    return { message };
  }
}
