import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ConflictException, BadRequestException } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<any>();
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new BadRequestException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key header required' });
    }
    const userId = req.user?.id || 'anonymous';
    const route = `${req.method} ${req.route?.path || req.url}`;
    const body = req.body;

    return from(this.idempotency.handle({
      key: idempotencyKey,
      userId,
      route,
      body,
      handler: async () => await next.handle().toPromise(),
    }).then((res) => {
      if ('conflict' in res) {
        throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Conflicting request for same key', details: { originalBodyHash: res.originalBodyHash } });
      }
      return res.response;
    }));
  }
}


