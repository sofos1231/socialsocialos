import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IdempotencyService } from '../idempotency/idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idem: IdempotencyService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest<Request & { headers: Record<string,string> }>();
    const key = (req.headers['idempotency-key'] || req.headers['Idempotency-Key']) as string | undefined;

    if (!key) return next.handle();

    return from(this.idem.isDuplicate(key)).pipe(
      switchMap(isDup => {
        if (isDup) {
          return from(this.idem.fetch(key)).pipe(switchMap(cached => {
            // If you cached full response, you’d return it; for now, just pass through.
            return next.handle(); 
          }));
        }
        return next.handle();
      }),
    );
  }
}
