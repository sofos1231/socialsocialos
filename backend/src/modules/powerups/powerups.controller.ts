import { Body, Controller, Get, Headers, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor';
import { PowerupsService } from './powerups.service';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('powerups')
@Controller('v1/powerups')
export class PowerupsController {
  constructor(private readonly powerups: PowerupsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get()
  @ApiOperation({ operationId: 'GET_/v1/powerups' })
  @ApiOkResponse({ description: 'Active and inventory' })
  async list(@Headers('authorization') authz: string) {
    const token = authz?.split(' ')[1] || '';
    return this.powerups.list(token);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Post('activate')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ operationId: 'POST_/v1/powerups/activate' })
  async activate(@Headers('authorization') authz: string, @Body() body: { type: string; attemptId: string }) {
    const token = authz?.split(' ')[1] || '';
    return this.powerups.activate(token, body);
  }
}


