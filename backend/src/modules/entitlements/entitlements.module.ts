// backend/src/modules/entitlements/entitlements.module.ts
// Step 5.12: Entitlements module

import { Module } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';

@Module({
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}

