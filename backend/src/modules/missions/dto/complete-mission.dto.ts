// FILE: backend/src/modules/missions/dto/complete-mission.dto.ts
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CompleteMissionDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsBoolean()
  isSuccess?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;
}
