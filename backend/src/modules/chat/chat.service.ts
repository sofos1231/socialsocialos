import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async handleUserMessage(userId: string, sessionId: string, content: string) {
    // Phase 2 later: call LLM, compute feedback, XP, etc.

    // For now just log the message as USER with no feedback.
    const message = await this.prisma.chatMessage.create({
      data: {
        userId,
        sessionId,
        role: 'USER',
        content,
      },
    });

    return { message };
  }
}
