import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ScaffoldService } from './scaffold.service';

@ApiTags('scaffold')
@Controller('api/scaffold')
export class ScaffoldController {
  constructor(private readonly scaffoldService: ScaffoldService) {}

  @Post('feature')
  @ApiOperation({ operationId: 'POST_/api/scaffold/feature' })
  @ApiOkResponse({ description: 'Scaffold feature' })
  scaffoldFeature(@Body() data: any) {
    return this.scaffoldService.scaffoldFeature(data);
  }
}
