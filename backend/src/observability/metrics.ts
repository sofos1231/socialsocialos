import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Counter, Histogram, collectDefaultMetrics, register } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration seconds',
  labelNames: ['service', 'route', 'method', 'code'] as const,
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['service', 'route', 'method', 'code'] as const,
});

collectDefaultMetrics();

export function setupHttpMetrics(app: NestFastifyApplication, service: string) {
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (req: any, _reply: any, done: any) => {
    (req as any)._start = process.hrtime.bigint();
    done();
  });
  fastify.addHook('onResponse', (req: any, reply: any, done: any) => {
    const start = (req as any)._start as bigint | undefined;
    const diffNs = start ? Number(process.hrtime.bigint() - start) : 0;
    const sec = diffNs / 1e9;
    const route = (req.routeOptions?.url || req.routerPath || req.raw?.url || '').split('?')[0] || 'unknown';
    const labels = {
      service,
      route,
      method: (req.raw?.method || req.method || 'GET').toUpperCase(),
      code: String(reply?.statusCode || 200),
    } as const;
    httpRequestDuration.labels(labels.service, labels.route, labels.method, labels.code).observe(sec);
    httpRequestsTotal.labels(labels.service, labels.route, labels.method, labels.code).inc(1);
    done();
  });
  fastify.get('/metrics', async (_req: any, reply: any) => {
    reply.header('Content-Type', register.contentType);
    reply.send(await register.metrics());
  });
}


