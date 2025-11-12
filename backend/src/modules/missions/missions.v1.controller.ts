import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor';
import { MissionsService } from './missions.service';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('missions')
@Controller('v1/missions')
export class MissionsV1Controller {
  constructor(private readonly missions: MissionsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async list() {
    return this.missions.getMissions();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @Post(':id/claim')
  async claim(@Param('id') id: string, @Body() body: { score?: number }) {
    return this.missions.completeMission(id, { clientTs: new Date().toISOString(), score: body?.score ?? 0 });
  }
}


