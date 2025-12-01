// FILE: backend/src/main.ts

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

function parseCorsOrigins(value?: string): string[] | boolean {
  const v = (value ?? '').trim();
  if (!v || v === '*') return true;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const apiPrefix = process.env.API_PREFIX || 'v1';
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  const origins = parseCorsOrigins(process.env.CORS_ORIGIN);
  if (origins === true) {
    app.enableCors({ origin: true, credentials: true });
  } else {
    app.enableCors({
      origin: origins,
      credentials: true,
    });
  }

  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(
    `Application is running on: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/${apiPrefix}`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
