// FILE: backend/src/modules/practice/dto/create-practice-session.dto.ts

import {
  IsArray,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PracticeMessageInput {
  @IsString()
  role: 'USER' | 'AI';

  @IsString()
  content: string;
}

export class CreatePracticeSessionDto {
  /**
   * ✅ Step 8: continue an existing session by id
   */
  @IsOptional()
  @IsString()
  sessionId?: string;

  /**
   * topic is required only for NEW sessions.
   * For continuation we fall back to the existing session.topic.
   */
  @ValidateIf((o) => !o.sessionId)
  @IsString()
  topic!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PracticeMessageInput)
  messages!: PracticeMessageInput[];

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  personaId?: string;
}
