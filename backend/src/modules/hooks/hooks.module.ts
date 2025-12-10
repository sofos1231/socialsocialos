// backend/src/modules/hooks/hooks.module.ts
// Step 7.2: Hooks admin module

import { Module } from '@nestjs/common';
import { HooksController } from './hooks.controller';
import { PrismaModule } from '../../db/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HooksController],
})
export class HooksModule {}

