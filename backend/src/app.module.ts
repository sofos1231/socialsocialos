import { Module } from '@nestjs/common';
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
import { ShopFeatureModule } from './modules/shop/shop.module';
import { PowerupsModule } from './modules/powerups/powerups.module';
import { IapModule } from './modules/iap/iap.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [
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
    ShopFeatureModule,
    PowerupsModule,
    IapModule,
    EventsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
