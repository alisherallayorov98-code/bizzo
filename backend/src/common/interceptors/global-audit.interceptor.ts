import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { Reflector } from '@nestjs/core'
import { AuditService } from '../../modules/audit/audit.service'
import { AUDIT_KEY }    from './audit.interceptor'

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Routes to skip auto-audit (too noisy or sensitive)
const SKIP_PREFIXES = [
  '/auth/refresh',
  '/notifications',
  '/health',
  '/monitoring',
  '/audit',
]

@Injectable()
export class GlobalAuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector:    Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const method  = request.method as string
    const path    = request.route?.path ?? request.url ?? ''

    // Skip non-write methods
    if (!WRITE_METHODS.has(method)) return next.handle()

    // Skip if handler has explicit @AuditLog decorator (already handled)
    const hasMeta = this.reflector.get(AUDIT_KEY, context.getHandler())
    if (hasMeta) return next.handle()

    // Skip noisy routes
    if (SKIP_PREFIXES.some(p => path.startsWith(p))) return next.handle()

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const user = request.user
          if (!user?.companyId) return

          // Derive entity name from path (e.g. /contacts/:id → contacts)
          const parts  = path.replace(/^\//, '').split('/')
          const entity = parts[0] || 'unknown'

          const action = method === 'DELETE' ? 'DELETE'
            : method === 'POST'   ? 'CREATE'
            : 'UPDATE'

          const entityId = responseData?.id
            || responseData?.data?.id
            || request.params?.id

          await this.auditService.log({
            companyId: user.companyId,
            userId:    user.sub || user.id,
            action:    action as any,
            entity,
            entityId,
            newData:   method !== 'DELETE'
              ? this.sanitize(responseData?.data ?? responseData)
              : undefined,
            ipAddress: request.ip || request.socket?.remoteAddress,
            userAgent: request.headers?.['user-agent'],
          })
        } catch {
          // Never crash the request
        }
      }),
    )
  }

  private sanitize(data: any): Record<string, any> | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined
    const safe = { ...data }
    ;['passwordHash', 'password', 'token', 'refreshToken', 'apiKey'].forEach(k => delete safe[k])
    return safe
  }
}
