import { Controller, Get, Post, Param, Body, Headers, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { CompleteMissionDto } from './missions.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('missions')
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  @ApiOperation({ operationId: 'GET_/missions' })
  @ApiOkResponse({ description: 'Get missions' })
  getMissions() {
    return this.missionsService.getMissions();
  }

  @Get(':id')
  @ApiOperation({ operationId: 'GET_/missions/{id}' })
  @ApiOkResponse({ description: 'Get mission by id' })
  getMission(@Param('id') id: string) {
    return this.missionsService.getMission(id);
  }

  @Post(':id/complete')
  @ApiOperation({ operationId: 'POST_/missions/{id}/complete' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiResponse({ status: 200, description: 'Complete mission' })
  @UseGuards(JwtGuard, RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  completeMission(
    @Param('id') id: string,
    @Body() data: CompleteMissionDto,
    @Headers('Idempotency-Key') _idempotencyKey?: string,
  ) {
    return this.missionsService.completeMission(id, data);
  }

  @Post(':id/start')
  @ApiOperation({ operationId: 'POST_/missions/{id}/start' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiResponse({ status: 201, description: 'Start mission' })
  @UseGuards(JwtGuard, RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  startMission(
    @Param('id') id: string,
    @Body() data: { clientTs: string },
    @Headers('Idempotency-Key') _idempotencyKey?: string,
  ) {
    return { ok: true, missionId: id, startedAt: data?.clientTs };
  }
}
