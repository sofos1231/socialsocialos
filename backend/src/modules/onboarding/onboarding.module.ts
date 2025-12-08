// FILE: backend/src/modules/onboarding/onboarding.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MeModule } from '../me/me.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [PrismaModule, MeModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}

