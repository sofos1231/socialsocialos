// FILE: backend/src/modules/ai-styles/ai-styles.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { AiStylesController } from './ai-styles.controller';
import { AiStylesService } from './ai-styles.service'; // TS2307

@Module({
  imports: [PrismaModule],
  controllers: [AiStylesController],
  providers: [AiStylesService],
  exports: [AiStylesService],
})
export class AiStylesModule {}
