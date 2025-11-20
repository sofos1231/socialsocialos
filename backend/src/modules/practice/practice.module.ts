// backend/src/modules/practice/practice.module.ts
import { Module } from '@nestjs/common';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { SessionsModule } from '../sessions/sessions.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    SessionsModule,
    AiModule,         // 👈 NEW — we inject AiScoringService from here
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
