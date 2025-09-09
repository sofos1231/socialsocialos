import { Module } from '@nestjs/common';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PracticeFlowService } from './practice.flow.service';

@Module({
  imports: [PrismaModule],
  controllers: [PracticeController],
  providers: [PracticeService, PracticeFlowService],
  exports: [PracticeService, PracticeFlowService],
})
export class PracticeModule {}
