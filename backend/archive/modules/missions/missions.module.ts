import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';

@Module({
  imports: [AuthModule, RateLimitModule, IdempotencyModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
