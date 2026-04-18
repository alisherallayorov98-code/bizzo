import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options',    'nosniff')
    res.setHeader('X-Frame-Options',           'DENY')
    res.setHeader('X-XSS-Protection',          '1; mode=block')
    res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy',        'camera=(), microphone=(), geolocation=()')

    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      )
    }

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')

    res.setHeader('Content-Security-Policy', csp)

    next()
  }
}
