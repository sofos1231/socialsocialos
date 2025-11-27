// FILE: backend/src/modules/ai/ai.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { AiScoringService } from './ai-scoring.service';
import { AiCoreScoringService } from './ai-core-scoring.service';
import { AiChatService } from './providers/ai-chat.service';
import { OpenAiClient } from './providers/openai.client';

@Module({
  imports: [PrismaModule],
  providers: [
    AiScoringService,
    AiCoreScoringService,

    // NEW: real chat replies
    OpenAiClient,
    AiChatService,
  ],
  exports: [
    AiScoringService,
    AiCoreScoringService,

    // export so PracticeService can inject it
    AiChatService,
  ],
})
export class AiModule {}
