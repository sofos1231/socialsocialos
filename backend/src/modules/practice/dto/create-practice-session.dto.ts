// backend/src/modules/practice/dto/create-practice-session.dto.ts

import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// הודעה אחת בסשן תרגול (טקסטואלי רגיל)
export class PracticeMessageDto {
  @IsString()
  role: 'USER' | 'AI';

  @IsString()
  content: string;

  // אופציונלי – נשתמש בזה רק אם נרצה חותמת זמן מהפרונט
  @IsOptional()
  @IsString()
  timestamp?: string;
}

// DTO של כל הסשן – מצב טקסט רגיל (כפי שהיה עד עכשיו)
export class CreatePracticeSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PracticeMessageDto)
  messages: PracticeMessageDto[];

  // שם נורמלי לשדה + אופציונלי
  @IsOptional()
  @IsString()
  topic?: string;
}

/**
 * Voice Practice – סשן מבוסס דיבור
 * הפרונט שולח לנו transcript אחד (טקסט מלא שהופק מ-speech-to-text).
 * בצד השרת אנחנו מפרקים אותו להודעה אחת (או יותר) ומשתמשים באותו לופ
 * של AiScoring + AiCore + SessionsService.
 */
export class CreateVoicePracticeSessionDto {
  @IsString()
  transcript: string;

  @IsOptional()
  @IsString()
  topic?: string;
}

/**
 * A vs B Practice – השוואה בין שתי תשובות אפשריות
 *
 * prompt  – ההקשר/שאלה (optional ללופ, חשוב לפרונט)
 * optionA – תשובה A של המשתמש
 * optionB – תשובה B של המשתמש
 *
 * בצד השרת:
 * - אנחנו נותנים ציון ל-A ול-B דרך AiScoring
 * - בוחרים winner
 * - בונים סשן אחד עם שתי הודעות (A ו-B) בלופ הרגיל
 * - AiCore מקבל את התשובה המנצחת כטקסט לניתוח עומק
 */
export class ComparePracticeOptionsDto {
  @IsOptional()
  @IsString()
  prompt?: string;

  @IsString()
  optionA: string;

  @IsString()
  optionB: string;

  @IsOptional()
  @IsString()
  topic?: string;
}
