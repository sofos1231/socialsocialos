// FILE: backend/src/modules/practice/practice.controller.ts

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PracticeService } from './practice.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';

@ApiTags('practice')
@ApiBearerAuth()
@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  /**
   * POST /v1/practice/session
   * Main AI text endpoint.
   * FE sends: { topic, messages[], templateId?, personaId? }
   */
  @Post('session')
  @UseGuards(JwtAuthGuard)
  async session(@Req() req: any, @Body() dto: CreatePracticeSessionDto) {
    // TODO: record fastpath_latency_ms here (start timer at HTTP entry)
    const userId = req.user?.sub ?? req.user?.id;
    return this.practiceService.runPracticeSession(userId, dto);
    // TODO: record fastpath_latency_ms here (stop timer after response returned)
  }
}
