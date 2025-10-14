import { Body, Controller, Get, Headers, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwt.guard';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor';
import { ShopService } from './shop.service';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('shop')
@Controller('v1/shop')
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get('catalog')
  @ApiOperation({ operationId: 'GET_/v1/shop/catalog' })
  @ApiOkResponse({ description: 'Shop catalog and deal banner' })
  async catalog() {
    return this.shop.getCatalog();
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard, RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Post('buy-powerup')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ operationId: 'POST_/v1/shop/buy-powerup' })
  async buy(@Headers('authorization') authz: string, @Body() body: { key: string; qty: number }) {
    const token = authz?.split(' ')[1] || '';
    return this.shop.buyPowerup(token, body);
  }
}
