// backend/src/modules/practice/practice.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { StatsModule } from '../stats/stats.module';
import { SessionsModule } from '../sessions/sessions.module';

import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [
    PrismaModule,
    StatsModule,
    SessionsModule,  // כדי להשתמש ב-createRealSession() או לנהל end-of-session logic
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
  exports: [PracticeService],
})
export class PracticeModule {}
