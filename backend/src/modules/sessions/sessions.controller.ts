import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../db/prisma.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sessions')
export class SessionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('mock')
  async createMock(@Req() req: any) {
    const userId = req.user?.userId;
    const session = await this.prisma.practiceSession.create({
      data: {
        userId,
        topic: 'Mock Session',
        score: 85,
        xpGained: 50,
        durationSec: 600,
        notes: 'Auto-generated mock session',
      },
    });
    return { ok: true, session };
  }

  @Get('dashboard/summary')
  async getDashboardSummary(@Req() req: any) {
    const userId = req.user?.userId;

    const [count, aggregate, last] = await Promise.all([
      this.prisma.practiceSession.count({ where: { userId } }),
      this.prisma.practiceSession.aggregate({
        where: { userId },
        _sum: { xpGained: true, durationSec: true },
      }),
      this.prisma.practiceSession.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, topic: true, xpGained: true },
      }),
    ]);

    return {
      ok: true,
      sessionsCount: count,
      totalXp: aggregate._sum.xpGained ?? 0,
      totalDurationSec: aggregate._sum.durationSec ?? 0,
      lastSession: last,
    };
  }
}


