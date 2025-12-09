// backend/src/modules/traits/traits.module.ts
// Step 5.1: Traits module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { TraitsService } from './traits.service';

@Module({
  imports: [PrismaModule],
  providers: [TraitsService],
  exports: [TraitsService],
})
export class TraitsModule {}

