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

import { MissionsAdminModule } from './modules/missions-admin/missions-admin.module';
import { MissionsModule } from './modules/missions/missions.module'; // ✅ player-facing

// backend/src/app.module.ts – RECOMMENDED
import { AiStylesModule } from './modules/ai-styles/ai-styles.module';

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

    MissionsAdminModule,
    MissionsModule,
    PersonasModule,
    AiStylesModule, // ✅ GET /v1/ai-styles
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
