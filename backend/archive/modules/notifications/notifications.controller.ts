import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Post('send')
  async send(@Body() body: { to: string; title: string; body: string }) {
    await this.svc.enqueue(body);
    return { status: 202 };
  }

  @Post('test')
  async test() {
    await this.svc.enqueue({ to: 'self', title: 'Test', body: 'ok' });
    return { status: 202 };
  }
}


