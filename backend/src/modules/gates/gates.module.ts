// backend/src/modules/gates/gates.module.ts
// Step 5.1: Gates module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { GatesService } from './gates.service';

@Module({
  imports: [PrismaModule],
  providers: [GatesService],
  exports: [GatesService],
})
export class GatesModule {}

