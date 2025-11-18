// backend/src/modules/practice/dto/create-practice-session.dto.ts

import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// הודעה אחת בסשן תרגול
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

// DTO של כל הסשן
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
