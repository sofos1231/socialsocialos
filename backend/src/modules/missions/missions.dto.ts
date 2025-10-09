import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsOptional, Min } from 'class-validator';

export class CompleteMissionDto {
  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  clientTs!: string;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;
}


