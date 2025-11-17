// backend/src/modules/practice/dto/create-practice-session.dto.ts
import { IsInt, Min, Max } from 'class-validator';

export class CreatePracticeSessionDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;
}
