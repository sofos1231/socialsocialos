import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { Time, isNextJeruDay, isSameJeruDay } from '../../common/time/time';

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  getMissions() {
    return {
      items: [
        { id: '1', title: 'First Steps', description: 'Complete your first practice session' },
        { id: '2', title: 'Streak Master', description: 'Maintain a 7-day streak' },
        { id: '3', title: 'Social Butterfly', description: 'Complete 10 networking sessions' }
      ]
    };
  }

  getMission(id: string) {
    return {
      id,
      title: 'Sample Mission',
      description: 'This is a sample mission',
      difficulty: 'beginner',
      xpReward: 50
    };
  }

  async completeMission(id: string, data: any) {
    // Apply XP boost if active; consume confidence booster for next session
    const userId = 'unknown';
    const now = Time.nowJeru();
    let xp = 50;
    const boost = await this.prisma.powerupInventory.findUnique({ where: { id: `${userId}:xp_boost_2x_24h` } });
    if (boost && boost.expiresAt && boost.expiresAt > now) {
      xp *= 2;
    }
    const conf = await this.prisma.powerupInventory.findUnique({ where: { id: `${userId}:confidence_booster_next` } });
    if (conf && conf.charges && conf.charges > 0) {
      await this.prisma.powerupInventory.update({ where: { id: conf.id }, data: { charges: { decrement: 1 } } });
    }
    // Streak update
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { streakCurrent: true, streakLastActiveAt: true } });
    let streakCurrent = user?.streakCurrent || 0;
    const last = user?.streakLastActiveAt || null;
    if (!last) {
      streakCurrent = 1;
    } else if (isSameJeruDay(last, now)) {
      // no change
    } else if (isNextJeruDay(last, now)) {
      streakCurrent += 1;
    } else {
      streakCurrent = 1;
    }
    await this.prisma.user.update({ where: { id: userId }, data: { streakCurrent, streakLastActiveAt: now } });

    // Emit mission_complete event with xpGranted
    await this.prisma.event.create({ data: { userId, name: 'mission_complete', props: { missionId: id, xpGranted: xp }, ts: now } });

    return { success: true, message: 'Mission completed', missionId: id, xpEarned: xp, streak: { current: streakCurrent, lastActiveDate: Time.toJeruISO(now) } };
  }
}
