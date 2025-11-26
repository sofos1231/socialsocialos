// FILE: backend/src/modules/missions-admin/missions-admin.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';

import { MissionsAdminController } from './missions-admin.controller';
import { MissionsAdminService } from './missions-admin.service';

import { MissionsAdminCategoriesController } from './missions-admin.categories.controller';
import { MissionsAdminPersonasController } from './missions-admin.personas.controller';
import { MissionsAdminMissionsPersonasController } from './missions-admin.missions-personas.controller';


@Module({
  imports: [PrismaModule],
  controllers: [
    MissionsAdminController,
    MissionsAdminCategoriesController,
    MissionsAdminPersonasController,
    MissionsAdminMissionsPersonasController, // ✅ alias route support
  ],
  providers: [MissionsAdminService],
})
export class MissionsAdminModule {}
