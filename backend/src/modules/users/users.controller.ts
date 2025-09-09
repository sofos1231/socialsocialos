import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ operationId: 'GET_/users/profile' })
  @ApiOkResponse({ description: 'Get user profile' })
  getProfile(@Req() req: any) {
    return this.usersService.getProfile();
  }

  @Put('profile')
  @ApiOperation({ operationId: 'PUT_/users/profile' })
  @ApiOkResponse({ description: 'Update user profile' })
  updateProfile(@Body() data: any, @Req() req: any) {
    return this.usersService.updateProfile(data);
  }
}
