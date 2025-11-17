// backend/src/modules/practice/practice.controller.ts

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PracticeService } from './practice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';

@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @UseGuards(JwtAuthGuard)
  @Post('session')
  async createSession(
    @Req() req: any,
    @Body() body: CreatePracticeSessionDto,
  ) {
    const userId = req.user.sub ?? req.user.id;

    const score = body.score;

    return this.practiceService.createSession(userId, score);
  }
}
