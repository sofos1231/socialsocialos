import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StatsService } from './stats.service';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('v1/stats')
export class StatsV1Controller {
  constructor(private readonly stats: StatsService) {}

  @Get('user/:userId')
  async getUser(@Param('userId') userId: string) {
    return this.stats.getOverview(userId);
  }

  @Get('history')
  async history() {
    return { items: [] };
  }

  @Post('update')
  async update(@Body() _body: { category?: string; value?: number }) {
    // TODO: implement update aggregation
    return { ok: true };
  }
}


