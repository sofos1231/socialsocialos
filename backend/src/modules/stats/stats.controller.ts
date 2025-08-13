import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  @ApiOperation({ operationId: 'GET_/stats/overview' })
  @ApiOkResponse({ description: 'Get stats overview' })
  getOverview() {
    return this.statsService.getOverview();
  }
}
