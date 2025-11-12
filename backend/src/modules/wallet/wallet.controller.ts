import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AuthGuard } from '@nestjs/passport';
import { AdjustDto } from './dto/adjust.dto';

@ApiTags('wallet')
@Controller('v1')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiOperation({ operationId: 'GET_/v1/me' })
  @ApiOkResponse({ description: 'Profile + wallet + plan + entitlements' })
  async me(@Headers('authorization') authz: string) {
    const token = authz?.split(' ')[1] || '';
    return this.wallet.getMe(token);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('wallet')
  @ApiOperation({ operationId: 'GET_/v1/wallet' })
  @ApiOkResponse({ description: 'Wallet balances' })
  async walletBalances(@Headers('authorization') authz: string) {
    const token = authz?.split(' ')[1] || '';
    return this.wallet.getWallet(token);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('wallet/adjust')
  @ApiOperation({ operationId: 'POST_/v1/wallet/adjust' })
  @ApiOkResponse({ description: 'Adjusted wallet balances' })
  async adjust(@Headers('authorization') authz: string, @Body() body: AdjustDto) {
    const token = authz?.split(' ')[1] || '';
    return this.wallet.adjustWallet(token, body as any);
  }
}


