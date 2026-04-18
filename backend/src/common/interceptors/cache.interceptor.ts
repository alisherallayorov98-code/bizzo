import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators'

const cache = new Map<string, { data: any; expiredAt: number }>()

export const CACHE_TTL_KEY = 'cache_ttl'
export const Cacheable = (ttlSeconds: number = 60) => SetMetadata(CACHE_TTL_KEY, ttlSeconds)

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler())

    if (!ttl || request.method !== 'GET') return next.handle()

    const user = request.user
    const cacheKey = `${user?.companyId}:${request.url}`
    const cached = cache.get(cacheKey)

    if (cached && Date.now() < cached.expiredAt) {
      return of(cached.data)
    }

    return next.handle().pipe(
      tap(data => {
        cache.set(cacheKey, { data, expiredAt: Date.now() + ttl * 1000 })
        if (cache.size > 1000) {
          const now = Date.now()
          for (const [key, value] of cache.entries()) {
            if (now > value.expiredAt) cache.delete(key)
          }
        }
      }),
    )
  }
}
