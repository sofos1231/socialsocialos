import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { WiringService } from './wiring.service';

@ApiTags('wiring')
@Controller('api/wiring')
export class WiringController {
  constructor(private readonly wiringService: WiringService) {}

  @Get()
  @ApiOperation({ operationId: 'GET_/api/wiring' })
  @ApiOkResponse({ description: 'Get wiring matrix' })
  getWiring() {
    return this.wiringService.getWiring();
  }

  @Post()
  @ApiOperation({ operationId: 'POST_/api/wiring' })
  @ApiOkResponse({ description: 'Update wiring matrix' })
  updateWiring(@Body() data: any) {
    return this.wiringService.updateWiring(data);
  }
}
