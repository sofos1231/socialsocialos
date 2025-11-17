import { Injectable } from '@nestjs/common';

@Injectable()
export class StatsService {
  getOverview(userId?: string) {
    return {
      userId: userId || null,
      totalSessions: 45,
      totalMissions: 12,
      totalXp: 1250,
      currentStreak: 7
    };
  }
}
