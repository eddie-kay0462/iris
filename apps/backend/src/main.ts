import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from './app.module';

/**
 * In production the API runs as several identical replicas behind Caddy, so
 * two things that are free on a single-instance host have to be arranged here:
 * only one container may own the schedulers, and the client IP has to come from
 * the proxy rather than the socket.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: new ConsoleLogger({
      // Structured lines in production so the hosted logs stay greppable;
      // the readable coloured output stays the default for local dev.
      json: process.env.LOG_FORMAT === 'json',
      colors: process.env.LOG_FORMAT !== 'json',
      timestamp: true,
    }),
  });
  const logger = new Logger('Bootstrap');

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Behind the reverse proxy, req.ip is the proxy's address unless Express is
  // told to read X-Forwarded-For. The public analytics ingest routes rate-limit
  // per IP, so without this every visitor shares one bucket and the beacon
  // starts dropping events for the whole store.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS for frontend + admin
  app.enableCors({
    origin: [
      // FRONTEND_URL points at the production storefront (used for email/SMS
      // links), so keep the local dev origins listed explicitly here.
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
      'http://localhost:3000',
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

  // Drain in-flight requests on SIGTERM instead of dropping them, so a rolling
  // restart doesn't fail the requests already in the container.
  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port);

  // Say plainly which mode this container is in. Whether exactly one instance
  // owns the schedulers is the thing most worth being able to confirm from the
  // logs — see the RUN_CRONS note in app.module.ts.
  if (process.env.RUN_CRONS === 'true') {
    // Only resolvable when ScheduleModule was registered, i.e. right here.
    // The names are generated UUIDs, so the count is the useful part.
    const jobs = app.get(SchedulerRegistry).getCronJobs().size;
    logger.log(`Schedulers ENABLED — ${jobs} cron job(s) registered`);
  } else {
    logger.log('Schedulers DISABLED on this instance (RUN_CRONS != true)');
  }

  logger.log(`Iris backend listening on port ${port}`);
}
bootstrap();
