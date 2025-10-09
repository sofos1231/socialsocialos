import { Body, Controller, Headers, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwt.guard';
import { IapService } from './iap.service';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('iap')
@Controller('v1/iap')
export class IapController {
  constructor(private readonly iap: IapService) {}

  @ApiBearerAuth()
  @UseGuards(JwtGuard, RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Post('verify-apple')
  @ApiOperation({ operationId: 'POST_/v1/iap/verify-apple' })
  async verifyApple(@Body() body: { transactionJWS?: string; appStoreReceipt?: string }) {
    return this.iap.verify('apple', body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard, RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Post('verify-google')
  @ApiOperation({ operationId: 'POST_/v1/iap/verify-google' })
  async verifyGoogle(@Body() body: { purchaseToken: string; sku: string }) {
    return this.iap.verify('google', body);
  }

  @Post('apple/notify')
  async appleNotify(@Body() body: { storeTxId: string; status: string }) {
    // Stub: flip status
    return { ok: true };
  }

  @Post('google/notify')
  async googleNotify(@Body() body: { storeTxId: string; status: string }) {
    // Stub: flip status
    return { ok: true };
  }
}


