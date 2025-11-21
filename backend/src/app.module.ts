import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';

import { PrismaModule } from './db/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { HealthModule } from './health/health.module';

// חדשים
import { PracticeModule } from './modules/practice/practice.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Core modules
    IdempotencyModule,
    PrismaModule,

    // Feature modules
    AuthModule,       // /v1/auth/*
    SessionsModule,   // /v1/sessions/*
    HealthModule,     // /v1/health/*
    PracticeModule,   // /v1/practice/*
    DashboardModule,  // /v1/dashboard/*
    ProfileModule,    // /v1/profile/*
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
