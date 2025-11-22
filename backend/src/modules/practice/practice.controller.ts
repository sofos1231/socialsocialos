// backend/src/modules/practice/practice.controller.ts
// backend/src/modules/practice/practice.controller.ts

import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PracticeService } from './practice.service';
import {
  CreatePracticeSessionDto,
  CreateVoicePracticeSessionDto,
  ComparePracticeOptionsDto,
} from './dto/create-practice-session.dto';

@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  /**
   * טקסט רגיל – הסשן הקיים.
   */
  @UseGuards(JwtAuthGuard)
  @Post('session')
  async runSession(@Req() req: any, @Body() dto: CreatePracticeSessionDto) {
    const userId = req.user?.sub;
    return this.practiceService.runRealSession(userId, dto);
  }

  /**
   * 7.1 – Voice Practice
   * frontend שולח transcript מלא (speech-to-text כבר בוצע בצד שלו).
   */
  @UseGuards(JwtAuthGuard)
  @Post('voice-session')
  async runVoiceSession(
    @Req() req: any,
    @Body() dto: CreateVoicePracticeSessionDto,
  ) {
    const userId = req.user?.sub;
    return this.practiceService.runVoiceSession(userId, dto);
  }

  /**
   * 7.3 – A vs B Practice
   * frontend שולח prompt (אופציונלי), optionA, optionB.
   */
  @UseGuards(JwtAuthGuard)
  @Post('ab-session')
  async runABSession(
    @Req() req: any,
    @Body() dto: ComparePracticeOptionsDto,
  ) {
    const userId = req.user?.sub;
    return this.practiceService.runABSession(userId, dto);
  }
}
