// backend/src/modules/synergy/synergy.module.ts
// Step 5.9: Trait Synergy Map module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { SynergyService } from './synergy.service';

@Module({
  imports: [PrismaModule],
  providers: [SynergyService],
  exports: [SynergyService], // Export for use in SessionsModule
})
export class SynergyModule {}

