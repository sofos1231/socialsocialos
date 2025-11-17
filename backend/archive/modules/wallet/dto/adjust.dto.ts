import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class DeltaDto {
  @IsOptional()
  @IsInt()
  coins?: number;

  @IsOptional()
  @IsInt()
  gems?: number;

  @IsOptional()
  @IsInt()
  xp?: number;
}

export class AdjustDto {
  // Optional: allow body to carry idempotency key (header is preferred)
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ValidateNested()
  @Type(() => DeltaDto)
  delta!: DeltaDto;
}
