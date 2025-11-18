import { Module } from '@nestjs/common';
import { PowerupsController } from './powerups.controller';
import { PowerupsService } from './powerups.service';
import { PrismaModule } from '../../db/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PowerupsController],
  providers: [PowerupsService],
  exports: [PowerupsService],
})
export class PowerupsModule {}
