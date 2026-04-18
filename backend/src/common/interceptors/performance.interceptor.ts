import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Har so'rov uchun vaqt kuzatuvi. 1s dan ko'p ishlagan endpointlarga ogohlantirish.
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Perf');
  private readonly SLOW_MS = Number(process.env.SLOW_REQUEST_MS || 1000);

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const t = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - t;
        if (ms >= this.SLOW_MS) {
          this.logger.warn(`SLOW ${ms}ms ${req.method} ${req.url}`);
        }
      }),
    );
  }
}
