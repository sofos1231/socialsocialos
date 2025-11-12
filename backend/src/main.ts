import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cors from '@fastify/cors';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CanonicalErrorFilter } from './common/http/canonical-error.filter';
import helmet from '@fastify/helmet';
import { setupHttpMetrics } from './observability/metrics';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // Enable CORS
  const allowList = (process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean)) || [
    'http://localhost:5173',
    'http://localhost:19006',
  ];
  await app.register(cors, {
    origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: ${origin} not allowed`), false);
    },
    credentials: true,
    allowedHeaders: ['authorization','content-type','idempotency-key','x-idempotency-key'],
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  } as any);

  // Security headers
  await app.register(helmet, { contentSecurityPolicy: false });



  // Correlation ID middleware
  app.use((req: any, res: any, next: any) => {
    const incomingId = req.headers['x-correlation-id'];
    const correlationId = typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : uuidv4();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // Global error filter
  app.useGlobalFilters(new CanonicalErrorFilter());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('SocialGym API')
    .setDescription('The SocialGym API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Metrics
  setupHttpMetrics(app, 'backend');

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
