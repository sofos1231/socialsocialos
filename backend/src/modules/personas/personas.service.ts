import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    // placeholder – Phase 2 will implement real logic
    return this.prisma.aiPersona.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
