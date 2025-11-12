import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { AuthGuard } from '@nestjs/passport';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { authAttemptsTotal } from '../../observability/custom-metrics';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(RateLimitGuard)
  @Post('login')
  async login(@Body() body: { email: string }) {
    try {
      const res = await this.auth.login(body.email);
      try { authAttemptsTotal.labels('/v1/auth/login', 'success').inc(1); } catch {}
      return res;
    } catch (e) {
      try { authAttemptsTotal.labels('/v1/auth/login', 'fail').inc(1); } catch {}
      throw e;
    }
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Headers('authorization') authz?: string) {
    const token = authz?.split(' ')[1] || '';
    const payload = await this.auth.verify(token);
    return this.auth.logout(payload.sub);
  }

  @UseGuards(RateLimitGuard)
  @Post('signup')
  async signup(@Body() dto: SignUpDto) {
    try {
      const res = await this.auth.signup(dto.email, dto.password, dto.name);
      try { authAttemptsTotal.labels('/v1/auth/signup', 'success').inc(1); } catch {}
      return res;
    } catch (e) {
      try { authAttemptsTotal.labels('/v1/auth/signup', 'fail').inc(1); } catch {}
      throw e;
    }
  }

  @UseGuards(RateLimitGuard)
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    try {
      const res = await this.auth.refresh(body.refreshToken);
      try { authAttemptsTotal.labels('/v1/auth/refresh', 'success').inc(1); } catch {}
      return res;
    } catch (e) {
      try { authAttemptsTotal.labels('/v1/auth/refresh', 'fail').inc(1); } catch {}
      throw e;
    }
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('revoke')
  async revoke(@Headers('authorization') authz?: string) {
    const token = authz?.split(' ')[1] || '';
    const payload = await this.auth.verify(token);
    await this.auth.revokeAll(payload.sub);
    return { ok: true };
  }
}


