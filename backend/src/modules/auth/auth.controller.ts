import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string }) {
    return this.auth.login(body.email);
  }

  @ApiBearerAuth()
  @Post('logout')
  async logout(@Headers('authorization') authz?: string) {
    const token = authz?.split(' ')[1] || '';
    const payload = await this.auth.verify(token);
    return this.auth.logout(payload.sub);
  }

  @Post('signup')
  async signup(@Body() dto: SignUpDto) {
    return this.auth.signup(dto.email, dto.password, dto.name);
  }
}


