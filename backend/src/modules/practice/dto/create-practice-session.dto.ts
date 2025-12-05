import {
  IsArray,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PracticeMessageInput {
  @IsString()
  role: 'USER' | 'AI';

  @IsString()
  content: string;
}

/**
 * FreePlay-specific config object.
 * FE should send: freeplay: { aiStyleKey }
 */
export class FreePlayConfig {
  @IsOptional()
  @IsString()
  aiStyleKey?: string;
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

  /**
   * ✅ NEW – mode:
   * - "MISSION"  => using mission template
   * - "FREEPLAY" => free play with explicit aiStyleKey
   *
   * Backward compatible: if omitted, backend infers from templateId.
   */
  @IsOptional()
  @IsString()
  @IsIn(['MISSION', 'FREEPLAY'])
  mode?: 'MISSION' | 'FREEPLAY';

  /**
   * ✅ NEW – FreePlay object wrapper:
   * freeplay: { aiStyleKey }
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => FreePlayConfig)
  freeplay?: FreePlayConfig;

  /**
   * ✅ Legacy root-level aiStyleKey (kept for compatibility).
   * FE SHOULD prefer: freeplay.aiStyleKey
   */
  @IsOptional()
  @IsString()
  aiStyleKey?: string;
}
