import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { PowerupsController } from './powerups.controller';
import { PowerupsService } from './powerups.service';

@Module({
  imports: [PrismaModule],
  controllers: [PowerupsController],
  providers: [PowerupsService],
})
export class PowerupsModule {}


