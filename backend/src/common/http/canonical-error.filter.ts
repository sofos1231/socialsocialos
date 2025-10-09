import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class CanonicalErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    const correlationId = request?.correlationId;
    const ts = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Unexpected error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      if (typeof res === 'object') {
        code = res.code || res.error || code;
        message = res.message || message;
        details = res.details || details;
      } else if (typeof res === 'string') {
        message = res;
      }
      if (status === HttpStatus.BAD_REQUEST && !code) {
        code = 'BAD_REQUEST';
      }
      if (status === HttpStatus.NOT_FOUND && !code) {
        code = 'NOT_FOUND';
      }
    }

    response.status(status).send({
      ok: false,
      error: { code, message, ...(details ? { details } : {}) },
      requestId: correlationId,
      ts,
    });
  }
}


