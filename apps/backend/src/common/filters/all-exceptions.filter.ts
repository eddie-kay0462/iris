import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * Nest's default filter only logs exceptions that aren't HttpExceptions, so a
 * 401/403/404/400 leaves no trace at all. That made a real walk-in bug
 * un-diagnosable: staff saw a failure toast, the order was written correctly,
 * and the hosted logs were completely silent. Log every exception, with enough
 * context to attribute it to a request and a user.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    let message: string;
    if (exception instanceof HttpException) {
      const body = exception.getResponse() as any;
      message =
        typeof body === 'string'
          ? body
          : Array.isArray(body?.message)
            ? body.message.join('; ')
            : (body?.message ?? exception.message);
    } else if (exception && typeof exception === 'object') {
      // Supabase/PostgREST errors are plain objects, not Errors — keep the
      // code and details, which are the parts worth reading.
      const err = exception as any;
      message =
        [err.message, err.code, err.details, err.hint]
          .filter(Boolean)
          .join(' | ') || JSON.stringify(exception);
    } else {
      message = String(exception);
    }

    const user = req?.user?.sub ? ` user=${req.user.sub}` : '';
    this.logger.error(
      `${req?.method} ${req?.originalUrl ?? req?.url} -> ${status}${user} :: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    super.catch(exception, host);
  }
}
