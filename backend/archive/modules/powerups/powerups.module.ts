import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PowerupsController } from './powerups.controller';
import { PowerupsService } from './powerups.service';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';

@Module({
  imports: [PrismaModule, AuthModule, RateLimitModule],
  controllers: [PowerupsController],
  providers: [PowerupsService],
})
export class PowerupsModule {}


