import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { MissionsService } from './missions.service';

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
  @ApiOkResponse({ description: 'Complete mission' })
  completeMission(@Param('id') id: string, @Body() data: any) {
    return this.missionsService.completeMission(id, data);
  }
}
