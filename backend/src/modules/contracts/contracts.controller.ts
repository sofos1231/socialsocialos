import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';

@ApiTags('contracts')
@Controller('api/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('openapi.json')
  @ApiOperation({ operationId: 'GET_/api/contracts/openapi.json' })
  @ApiOkResponse({ description: 'Get OpenAPI specification' })
  getOpenApi() {
    return this.contractsService.getOpenApi();
  }

  @Post('sync')
  @ApiOperation({ operationId: 'POST_/api/contracts/sync' })
  @ApiOkResponse({ description: 'Sync contracts' })
  sync(@Body() data: any) {
    return this.contractsService.sync(data);
  }
}
