import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PracticeService } from './practice.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';

@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @UseGuards(JwtAuthGuard)
  @Post('session')
  async runSession(
    @Req() req: any,
    @Body() dto: CreatePracticeSessionDto,
  ) {
    const userId = req.user?.sub;
    return this.practiceService.runRealSession(userId, dto);
  }
}
