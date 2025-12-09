// FILE: backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';

import { PrismaModule } from './db/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { HealthModule } from './health/health.module';
import { PersonasModule } from './modules/personas/personas.module';

import { PracticeModule } from './modules/practice/practice.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProfileModule } from './modules/profile/profile.module';
import { MeModule } from './modules/me/me.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';

import { MissionsAdminModule } from './modules/missions-admin/missions-admin.module';
import { MissionsModule } from './modules/missions/missions.module'; // ✅ player-facing

// backend/src/app.module.ts – RECOMMENDED
import { AiStylesModule } from './modules/ai-styles/ai-styles.module';
import { InsightsModule } from './modules/insights/insights.module';
// Step 5.1: Import new analytics modules
import { MoodModule } from './modules/mood/mood.module';
import { TraitsModule } from './modules/traits/traits.module';
import { GatesModule } from './modules/gates/gates.module';
import { PromptsModule } from './modules/prompts/prompts.module';
// Step 5.4: Import badges module
import { BadgesModule } from './modules/badges/badges.module';
// Step 5.7: Import analyzer module
import { AnalyzerModule } from './modules/analyzer/analyzer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    IdempotencyModule,
    PrismaModule,

    AuthModule,
    SessionsModule,
    HealthModule,
    PracticeModule,
    DashboardModule,
    ProfileModule,
    MeModule, // ✅ GET /v1/me/app-state
    OnboardingModule, // ✅ PUT /v1/onboarding/preferences, POST /v1/onboarding/skip, POST /v1/onboarding/complete

    MissionsAdminModule,
    MissionsModule,
    PersonasModule,
    AiStylesModule, // ✅ GET /v1/ai-styles
    InsightsModule, // Phase 1: Deep Insights Engine
    // Step 5.1: Analytics modules
    MoodModule,
    TraitsModule,
    GatesModule,
    PromptsModule,
    // Step 5.4: Badges module
    BadgesModule,
    // Step 5.7: Analyzer module
    AnalyzerModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
