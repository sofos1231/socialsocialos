import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';

@Module({
  imports: [PrismaModule, RateLimitModule, IdempotencyModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}


