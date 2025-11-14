import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { AppModule } from './app.module';
import { CanonicalErrorFilter } from './common/http/canonical-error.filter';
import { setupHttpMetrics } from './observability/metrics';

async function bootstrap() {
  // Clean Fastify bootstrap (no dangling commas/args)
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Global prefix (keep options out to avoid TS issues)
const prefix = process.env.API_PREFIX ?? 'v1';
console.log('[BOOT] API_PREFIX =', prefix);  // 👈 add this

app.setGlobalPrefix(prefix);

  // --- CORS (Fastify v4) ---
  const allowList =
    process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ??
    ['http://localhost:5173', 'http://localhost:19006'];

  await app.register(cors as any, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (!origin) return cb(null, true); // non-browser or same-origin
      cb(null, allowList.includes(origin));
    },
    credentials: true,
    allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-idempotency-key'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  } as any);

  // --- Security headers ---
  await app.register(helmet as any, { contentSecurityPolicy: false } as any);

  // --- Correlation ID (Fastify hook) ---
  // Correlation ID (Fastify hook)
const fastify = app.getHttpAdapter().getInstance();
fastify.addHook('onRequest', async (req: any, reply: any) => {
  const incomingId = (req.headers as any)['x-correlation-id'];
  const correlationId =
    typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : uuidv4();
  (req as any).correlationId = correlationId;
  reply.header('X-Correlation-Id', correlationId);
});


  // --- Global validation & canonical error shaping ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new CanonicalErrorFilter());

  // --- Swagger (served under the same prefix) ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SocialGym API')
    .setDescription('The SocialGym API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/api`, app, document);

  // --- Metrics ---
  setupHttpMetrics(app, 'backend');

  // --- Start ---
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}/${prefix}`);
}

bootstrap();
