import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { PrismaModule } from '../../db/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';

@Module({
  imports: [PrismaModule, IdempotencyModule, AuthModule, RateLimitModule],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
