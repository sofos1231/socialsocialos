import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  async sendMessage(
    @Req() req: any,
    @Body() body: { sessionId: string; content: string },
  ) {
    const userId = req.user.sub ?? req.user.id;
    return this.chatService.handleUserMessage(userId, body.sessionId, body.content);
  }
}
