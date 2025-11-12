import { Body, Controller, Get, Put, UseGuards, Req, ConflictException, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './users.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiOperation({ operationId: 'GET_/users/profile' })
  @ApiOkResponse({ description: 'Get user profile' })
  getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user?.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  @ApiOperation({ operationId: 'PUT_/users/profile' })
  @ApiOkResponse({ description: 'Update user profile' })
  updateProfile(@Req() req: any, @Body() data: UpdateProfileDto) {
    if (!data || (!data.name && !data.email && data.xp === undefined)) throw new BadRequestException({ code: 'INVALID_BODY', message: 'Nothing to update' });
    return this.usersService.updateProfile(req.user?.id, data);
  }
}
