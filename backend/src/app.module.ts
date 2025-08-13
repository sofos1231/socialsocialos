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
  ],
  controllers: [AppController],
})
export class AppModule {}
