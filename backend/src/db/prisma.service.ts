import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // 👇 explicitly cast event name to keyof PrismaClient
    (this as any).$on('beforeExit' as any, async () => {
      await app.close();
    });
  }
}
