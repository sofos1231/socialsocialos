import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PowerupsService } from './powerups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('powerups')
@UseGuards(JwtAuthGuard)
export class PowerupsController {
  constructor(private readonly powerupsService: PowerupsService) {}

  @Get('available')
  async getAvailable(@Req() req: any) {
    const userId = req.user.sub ?? req.user.id;
    return this.powerupsService.getAvailableForUser(userId);
  }
}
