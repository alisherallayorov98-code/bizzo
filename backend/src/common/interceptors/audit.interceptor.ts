import {
  Injectable, NestInterceptor,
  ExecutionContext, CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap }        from 'rxjs/operators'
import { Reflector }  from '@nestjs/core'
import { AuditService, AuditAction } from '../../modules/audit/audit.service'

export const AUDIT_KEY = 'audit_action'

export const AuditLog = (action: AuditAction, entity: string): MethodDecorator =>
  (_target, _key, descriptor: any) => {
    Reflect.defineMetadata(AUDIT_KEY, { action, entity }, descriptor.value)
    return descriptor
  }

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector:    Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<{ action: AuditAction; entity: string }>(
      AUDIT_KEY,
      context.getHandler(),
    )

    if (!meta) return next.handle()

    const request   = context.switchToHttp().getRequest()
    const user      = request.user
    const ipAddress = request.ip || request.socket?.remoteAddress
    const userAgent = request.headers?.['user-agent']

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          if (!user?.companyId) return
          const entityId = responseData?.id
            || responseData?.data?.id
            || request.params?.id

          await this.auditService.log({
            companyId: user.companyId,
            userId:    user.id,
            action:    meta.action,
            entity:    meta.entity,
            entityId,
            newData:   meta.action !== 'DELETE'
              ? this.extractSafeData(responseData)
              : undefined,
            ipAddress,
            userAgent,
          })
        } catch {
          // Audit log xatoligi asosiy jarayonni to'xtata olmasin
        }
      }),
    )
  }

  private extractSafeData(data: any): Record<string, any> | undefined {
    if (!data || typeof data !== 'object') return undefined
    const sensitive = ['passwordHash', 'password', 'token', 'refreshToken', 'apiKey']
    const result    = { ...data }
    sensitive.forEach(k => delete result[k])
    return result
  }
}
