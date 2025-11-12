import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { CanonicalErrorFilter } from '../../../src/common/http/canonical-error.filter';
import { setupHttpMetrics } from '../../../src/observability/metrics';

export async function createTestApp(): Promise<NestFastifyApplication> {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  if (!process.env.JWT_SECRET && !process.env.JWT_PUBLIC_KEY) {
    process.env.JWT_SECRET = 'test-secret';
  }
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.register(cors, { origin: ['http://localhost:5173'], credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new CanonicalErrorFilter());
  setupHttpMetrics(app, 'backend');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}


