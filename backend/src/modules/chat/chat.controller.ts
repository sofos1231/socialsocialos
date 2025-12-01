// backend/src/modules/chat/chat.controller.ts

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /v1/chat/message
   * Logs a user message into ChatMessage.
   * (AI reply generation is handled elsewhere: Practice/Ai modules.)
   */
  @Post('message')
  async sendMessage(
    @Req() req: any,
    @Body() body: { sessionId: string; content: string },
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.chatService.handleUserMessage(userId, body?.sessionId, body?.content);
  }
}
