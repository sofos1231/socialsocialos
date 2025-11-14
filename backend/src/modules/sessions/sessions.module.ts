import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { PrismaModule } from '../../db/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SessionsController],
})
export class SessionsModule {}


