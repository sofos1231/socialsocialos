import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtGuard } from '../auth/jwt.guard';

@ApiTags('wallet')
@Controller('v1')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get('me')
  @ApiOperation({ operationId: 'GET_/v1/me' })
  @ApiOkResponse({ description: 'Profile + wallet + plan + entitlements' })
  async me(@Headers('authorization') authz: string) {
    const token = authz?.split(' ')[1] || '';
    return this.wallet.getMe(token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get('wallet')
  @ApiOperation({ operationId: 'GET_/v1/wallet' })
  @ApiOkResponse({ description: 'Wallet balances' })
  async walletBalances(@Headers('authorization') authz: string) {
    const token = authz?.split(' ')[1] || '';
    return this.wallet.getWallet(token);
  }
}


