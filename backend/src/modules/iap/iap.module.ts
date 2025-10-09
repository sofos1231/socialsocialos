import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { IapController } from './iap.controller';
import { IapService } from './iap.service';

@Module({
  imports: [PrismaModule],
  controllers: [IapController],
  providers: [IapService],
})
export class IapModule {}


