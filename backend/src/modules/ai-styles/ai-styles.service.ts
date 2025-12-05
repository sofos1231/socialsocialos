// FILE: backend/src/modules/ai-styles/ai-styles.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class AiStylesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    // Return raw array for maximum FE compatibility
    return this.prisma.aiStyle.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
      select: {
        key: true,
        name: true,
        description: true,
      },
    });
  }
}
