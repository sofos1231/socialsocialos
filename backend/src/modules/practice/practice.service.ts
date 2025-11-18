// backend/src/modules/practice/practice.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';

// דפוס ניקוד זמני עד שיהיה לנו AI אמיתי
const SCORE_PATTERN = [62, 74, 88, 96];

@Injectable()
export class PracticeService {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Phase 3.4: סשן תרגול אמיתי.
   * כרגע – רק ממפה הודעות → ציונים לפי דפוס קבוע,
   * ואז משתמש במנוע הכללי של SessionsService.
   */
  async runRealSession(userId: string, dto: CreatePracticeSessionDto) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const messages = dto.messages ?? [];
    if (!messages.length) {
      throw new BadRequestException({
        code: 'SESSION_EMPTY',
        message: 'messages must contain at least one message',
      });
    }

    const topic = dto.topic?.trim() || 'Practice session';

    // ⚠️ כרגע אין לנו AI – אז נותנים ציונים לפי pattern קבוע
    // [62, 74, 88, 96] בלופ – רק כדי להפעיל את מנוע ה־scoring.
    const messageScores = messages.map(
      (_m, index) => SCORE_PATTERN[index % SCORE_PATTERN.length],
    );

    // מנוע מלא: יוצר PracticeSession, ChatMessage, מעדכן סטטיסטיקות וארנק,
    // ומחזיר rewards + dashboard + sessionId.
    return this.sessionsService.createScoredSessionFromScores({
      userId,
      topic,
      messageScores,
    });
  }
}
