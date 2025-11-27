// FILE: backend/src/modules/practice/dto/create-practice-session.dto.ts

import {
  IsArray,
  IsOptional,
  IsString,
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
  @IsString()
  topic: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PracticeMessageInput)
  messages: PracticeMessageInput[];

  /**
   * ⚡ NEW: mission template context
   */
  @IsOptional()
  @IsString()
  templateId?: string;

  /**
   * ⚡ NEW: mission persona context
   */
  @IsOptional()
  @IsString()
  personaId?: string;
}
