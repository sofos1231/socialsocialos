// FILE: backend/src/modules/me/me.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [PrismaModule],
  controllers: [MeController],
  providers: [MeService],
  exports: [MeService],
})
export class MeModule {}

