// backend/src/modules/profile/profile.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [PrismaModule],
  providers: [ProfileService],
  controllers: [ProfileController],
  exports: [ProfileService],
})
export class ProfileModule {}
