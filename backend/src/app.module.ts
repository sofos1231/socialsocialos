import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { ContractsModule } from './modules/contracts/contracts.module';
import { WiringModule } from './modules/wiring/wiring.module';
import { LogsModule } from './modules/logs/logs.module';
import { ScaffoldModule } from './modules/scaffold/scaffold.module';

import { PracticeModule } from './modules/practice/practice.module';
import { UsersModule } from './modules/users/users.module';
import { StatsModule } from './modules/stats/stats.module';
import { ShopModule } from './modules/shop/shop.module';
import { MissionsModule } from './modules/missions/missions.module';
import { PrismaModule } from './db/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PowerupsModule } from './modules/powerups/powerups.module';
import { IapModule } from './modules/iap/iap.module';
import { EventsModule } from './modules/events/events.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MissionsV1Controller } from './modules/missions/missions.v1.controller';
import { StatsV1Controller } from './modules/stats/stats.v1.controller';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ContractsModule,
    WiringModule,
    LogsModule,
    ScaffoldModule,

    PracticeModule,
    UsersModule,
    StatsModule,
    ShopModule,
    MissionsModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    WalletModule,
    PowerupsModule,
    IapModule,
    EventsModule,
    SubscriptionsModule,
    NotificationsModule,
    RateLimitModule,
    IdempotencyModule,
  ],
  controllers: [AppController, MissionsV1Controller, StatsV1Controller],
})
export class AppModule {}
