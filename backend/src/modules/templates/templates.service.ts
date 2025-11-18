import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    return this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
