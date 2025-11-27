// FILE: backend/src/modules/practice/practice.controller.ts

import {
  Controller,
  Post,
  Req,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PracticeService } from './practice.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('practice')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  /**
   * Main AI text endpoint.
   * FE sends: { topic, messages[], templateId?, personaId? }
   */
  @Post('session')
  @UseGuards(JwtAuthGuard)
  async session(
    @Req() req: any,
    @Body() dto: CreatePracticeSessionDto,
  ) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);

    return this.practice.runPracticeSession(String(userId), dto);
  }
}
