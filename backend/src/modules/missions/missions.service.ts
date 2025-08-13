import { Injectable } from '@nestjs/common';

@Injectable()
export class MissionsService {
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

  completeMission(id: string, data: any) {
    return {
      success: true,
      message: 'Mission completed',
      missionId: id,
      xpEarned: 50
    };
  }
}
