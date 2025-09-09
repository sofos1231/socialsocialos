import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ShopService } from './shop.service';

@ApiTags('shop')
@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  @ApiOperation({ operationId: 'GET_/shop/items' })
  @ApiOkResponse({ description: 'Get shop items' })
  getItems() {
    return this.shopService.getItems();
  }

  @Post('purchase')
  @ApiOperation({ operationId: 'POST_/shop/purchase' })
  @ApiOkResponse({ description: 'Purchase item' })
  purchase(@Body() data: any) {
    return this.shopService.purchase(data);
  }
}
