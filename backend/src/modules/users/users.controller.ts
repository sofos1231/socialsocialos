import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './users.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ operationId: 'GET_/users/profile' })
  @ApiOkResponse({ description: 'Get user profile' })
  getProfile() {
    return this.usersService.getProfile();
  }

  @Put('profile')
  @ApiOperation({ operationId: 'PUT_/users/profile' })
  @ApiOkResponse({ description: 'Update user profile' })
  updateProfile(@Body() data: UpdateProfileDto) {
    return this.usersService.updateProfile(data);
  }
}
