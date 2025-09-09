import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @ApiOperation({ operationId: 'POST_/auth/login' })
  @ApiOkResponse({ description: 'Login and get JWT' })
  login(@Body() body: { email: string }) {
    return this.auth.login(body);
  }
}


