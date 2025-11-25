// FILE: backend/src/modules/missions-admin/missions-admin.personas.controller.ts

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Controller('admin/personas')
export class MissionsAdminPersonasController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /v1/admin/personas
   * Returns active AI personas for the Mission Builder dropdown.
   */
  @Get()
  async list() {
    return this.prisma.aiPersona.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
  }
}
