import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { IapController } from './iap.controller';
import { IapService } from './iap.service';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';

@Module({
  imports: [PrismaModule, IdempotencyModule, RateLimitModule],
  controllers: [IapController],
  providers: [IapService],
})
export class IapModule {}


