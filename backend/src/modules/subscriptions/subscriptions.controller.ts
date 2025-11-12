import { Body, Controller, Get, Post, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor';
import { SubscriptionsService } from './subscriptions.service';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Post('v1/iap/receipt')
  async receipt(@Req() req: any, @Body() body: { store: 'APPLE'|'GOOGLE'|'RC'; productId: string; token: string; deviceId?: string }) {
    const userId = req?.user?.sub || req?.user?.userId;
    return this.svc.handleReceipt(userId, body);
  }

  @Post('v1/subscriptions/webhook')
  async webhook(@Body() body: any) {
    // TODO: verify signature & IP allowlist
    await this.svc.handleWebhook(body);
    return { status: 202 };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('v1/entitlements')
  async entitlements(@Req() req: any) {
    const userId = req?.user?.sub || req?.user?.userId;
    return this.svc.getEntitlements(userId);
  }
}


