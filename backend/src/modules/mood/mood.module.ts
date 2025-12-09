// backend/src/modules/mood/mood.module.ts
// Step 5.1: Mood module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { MoodService } from './mood.service';

@Module({
  imports: [PrismaModule],
  providers: [MoodService],
  exports: [MoodService],
})
export class MoodModule {}

