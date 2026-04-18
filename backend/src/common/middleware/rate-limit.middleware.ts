import {
  Injectable, NestMiddleware,
  HttpException, HttpStatus,
} from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

interface RateLimitOptions {
  windowMs:    number
  maxRequests: number
  keyPrefix:   string
}

interface RateLimitRecord {
  count:   number
  resetAt: number
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store = new Map<string, RateLimitRecord>()

  createLimiter(options: RateLimitOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip  = req.ip || req.socket.remoteAddress || 'unknown'
      const key = `${options.keyPrefix}:${ip}`
      const now = Date.now()

      let record = this.store.get(key)
      if (!record || now > record.resetAt) {
        record = { count: 0, resetAt: now + options.windowMs }
        this.store.set(key, record)
      }

      record.count++

      res.setHeader('X-RateLimit-Limit',     options.maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - record.count))
      res.setHeader('X-RateLimit-Reset',     Math.ceil(record.resetAt / 1000))

      if (record.count > options.maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000)
        res.setHeader('Retry-After', retryAfter)

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:    `Juda ko'p so'rov. ${retryAfter} soniyadan so'ng qayta urining.`,
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      // Periodic store cleanup
      if (Math.random() < 0.001) {
        const nowClean = Date.now()
        for (const [k, v] of this.store.entries()) {
          if (nowClean > v.resetAt) this.store.delete(k)
        }
      }

      next()
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    next()
  }
}

export const RATE_LIMITS = {
  auth:   { windowMs: 15 * 60 * 1000, maxRequests: process.env.NODE_ENV === 'development' ? 200 : 10, keyPrefix: 'rl:auth' },
  api:    { windowMs: 60 * 1000,       maxRequests: 200, keyPrefix: 'rl:api'    },
  export: { windowMs: 5 * 60 * 1000,   maxRequests: 10,  keyPrefix: 'rl:export' },
  ai:     { windowMs: 60 * 1000,       maxRequests: 20,  keyPrefix: 'rl:ai'     },
}
