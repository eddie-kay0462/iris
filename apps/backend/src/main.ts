import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // CORS for frontend + admin
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'https://1nri.store',
      /\.1nri\.store$/,
      /\.vercel\.app$/,
    ],
    credentials: true,
  });

  // Global validation pipe (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Iris backend running on http://localhost:${port}`);
}
bootstrap();
