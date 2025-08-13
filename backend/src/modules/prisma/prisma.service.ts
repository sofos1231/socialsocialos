import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaService {
  apply() {
    return { success: true, message: 'Prisma schema applied' };
  }

  migrate() {
    return { success: true, message: 'Prisma migrations completed' };
  }
}
