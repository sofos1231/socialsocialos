import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    if (!userId) throw new BadRequestException({ code: 'AUTH_REQUIRED', message: 'Missing user' });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } as any });
    return { name: (user as any)?.name || '', email: (user as any)?.email || '' };
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; xp?: number }) {
    if (!userId) throw new BadRequestException({ code: 'AUTH_REQUIRED', message: 'Missing user' });
    try {
      const updated = await this.prisma.user.update({ where: { id: userId }, data: { name: data.name ?? undefined, email: data.email ?? undefined } as any, select: { name: true, email: true } as any });
      return { success: true, message: 'Profile updated', profile: updated };
    } catch (e: any) {
      if (String(e?.message || '').includes('Unique') || String(e?.code || '').toUpperCase() === 'P2002') {
        throw new ConflictException({ code: 'EMAIL_CONFLICT', message: 'Email already in use' });
      }
      throw e;
    }
  }
}
