import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cors from '@fastify/cors';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CanonicalErrorFilter } from './common/http/canonical-error.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // Enable CORS
  await app.register(cors, {
    origin: ['http://localhost:5173'],
    credentials: true,
  });



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

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
