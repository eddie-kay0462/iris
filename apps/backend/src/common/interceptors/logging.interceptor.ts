import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/** One line per request: method, path, status, duration. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Request');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest();
    const started = Date.now();
    const path = req?.originalUrl ?? req?.url;

    return next.handle().pipe(
      tap({
        // Failures are logged by AllExceptionsFilter, which has the status and
        // the message — logging them here too would just double every error.
        next: () => {
          const status = http.getResponse()?.statusCode;
          this.logger.log(
            `${req?.method} ${path} -> ${status} (${Date.now() - started}ms)`,
          );
        },
      }),
    );
  }
}
