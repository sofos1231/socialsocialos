import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();
    const authz = req.headers['authorization'];
    if (!authz || typeof authz !== 'string' || !authz.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Authorization header required' });
    }
    const token = authz.slice(7);
    const payload = await this.auth.verify(token);
    req.user = { id: payload.sub };
    return true;
  }
}


