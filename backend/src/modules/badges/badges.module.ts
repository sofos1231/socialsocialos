// backend/src/modules/badges/badges.module.ts
// Step 5.4: Badges module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { BadgesService } from './badges.service';

@Module({
  imports: [PrismaModule],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}

