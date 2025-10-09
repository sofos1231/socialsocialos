import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rl: RateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const userId = req.user?.id || 'anonymous';
    const route = `${req.method} ${req.route?.path || req.url}`;
    const key = `${userId}:${route}`;
    // Example: 5 req per minute → refill 1 token / 12 sec
    this.rl.enforce(key, 5, 1 / 12);
    return true;
  }
}


