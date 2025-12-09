// backend/src/modules/prompts/prompts.module.ts
// Step 5.1: Prompts module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { PromptsService } from './prompts.service';

@Module({
  imports: [PrismaModule],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}

