// backend/src/modules/engine-config/config-slots.service.ts
// Config Slots service for snapshot management

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { EngineConfigJson } from './engine-config.types';

export interface ConfigSlotData {
  id: string;
  name: string;
  slotNumber?: number | null;
  engineConfigJson: EngineConfigJson;
  categoriesJson?: any;
  missionsJson?: any;
  defaultSeedKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ConfigSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSlots(): Promise<ConfigSlotData[]> {
    const slots = await this.prisma.configSlot.findMany({
      orderBy: [{ slotNumber: 'asc' }, { createdAt: 'desc' }],
    });
    return slots as any as ConfigSlotData[];
  }

  async getSlot(id: string): Promise<ConfigSlotData> {
    const slot = await this.prisma.configSlot.findUnique({
      where: { id },
    });
    if (!slot) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Config slot not found' });
    }
    return slot as any as ConfigSlotData;
  }

  async getSlotByNumber(slotNumber: number): Promise<ConfigSlotData | null> {
    const slot = await this.prisma.configSlot.findUnique({
      where: { slotNumber },
    });
    return slot ? (slot as any as ConfigSlotData) : null;
  }

  async createSlot(data: {
    name: string;
    slotNumber?: number | null;
    engineConfigJson: EngineConfigJson;
    categoriesJson?: any;
    missionsJson?: any;
    defaultSeedKey?: string | null;
  }): Promise<ConfigSlotData> {
    // Validate slotNumber uniqueness if provided
    if (data.slotNumber !== null && data.slotNumber !== undefined) {
      const existing = await this.prisma.configSlot.findUnique({
        where: { slotNumber: data.slotNumber },
      });
      if (existing) {
        throw new BadRequestException({
          code: 'SLOT_NUMBER_EXISTS',
          message: `Slot number ${data.slotNumber} already exists`,
        });
      }
    }

    const slot = await this.prisma.configSlot.create({
      data: {
        name: data.name,
        slotNumber: data.slotNumber ?? null,
        engineConfigJson: data.engineConfigJson as any,
        categoriesJson: data.categoriesJson ?? null,
        missionsJson: data.missionsJson ?? null,
        defaultSeedKey: data.defaultSeedKey ?? null,
      },
    });

    return slot as any as ConfigSlotData;
  }

  async updateSlot(
    id: string,
    data: {
      name?: string;
      slotNumber?: number | null;
      engineConfigJson?: EngineConfigJson;
      categoriesJson?: any;
      missionsJson?: any;
      defaultSeedKey?: string | null;
    },
  ): Promise<ConfigSlotData> {
    // Check if slot exists
    const existing = await this.prisma.configSlot.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Config slot not found' });
    }

    // Validate slotNumber uniqueness if changing
    if (data.slotNumber !== undefined && data.slotNumber !== existing.slotNumber) {
      if (data.slotNumber !== null) {
        const conflict = await this.prisma.configSlot.findUnique({
          where: { slotNumber: data.slotNumber },
        });
        if (conflict && conflict.id !== id) {
          throw new BadRequestException({
            code: 'SLOT_NUMBER_EXISTS',
            message: `Slot number ${data.slotNumber} already exists`,
          });
        }
      }
    }

    const slot = await this.prisma.configSlot.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slotNumber !== undefined && { slotNumber: data.slotNumber }),
        ...(data.engineConfigJson !== undefined && { engineConfigJson: data.engineConfigJson as any }),
        ...(data.categoriesJson !== undefined && { categoriesJson: data.categoriesJson }),
        ...(data.missionsJson !== undefined && { missionsJson: data.missionsJson }),
        ...(data.defaultSeedKey !== undefined && { defaultSeedKey: data.defaultSeedKey }),
      },
    });

    return slot as any as ConfigSlotData;
  }

  async deleteSlot(id: string): Promise<void> {
    const existing = await this.prisma.configSlot.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Config slot not found' });
    }

    await this.prisma.configSlot.delete({
      where: { id },
    });
  }
}

