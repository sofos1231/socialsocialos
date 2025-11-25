// FILE: backend/src/modules/practice/dto/create-practice-session.dto.ts
import { IsArray, IsOptional, IsString, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PracticeMessageDto {
  @IsString()
  @IsIn(['USER', 'AI'])
  role: 'USER' | 'AI';

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class CreatePracticeSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PracticeMessageDto)
  messages: PracticeMessageDto[];

  @IsOptional()
  @IsString()
  topic?: string;

  // ✅ mission wiring (was getting stripped by ValidationPipe before)
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  personaId?: string;
}

export class CreateVoicePracticeSessionDto {
  @IsString()
  transcript: string;

  @IsOptional()
  @IsString()
  topic?: string;
}

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
