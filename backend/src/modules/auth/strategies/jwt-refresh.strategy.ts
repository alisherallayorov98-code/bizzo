import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new InternalServerErrorException('JWT_REFRESH_SECRET env o\'rnatilmagan');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration:  false,
      secretOrKey:       secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken =
      req.cookies?.['refresh_token'] || req.body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token yo'q");
    }

    return { ...payload, refreshToken };
  }
}
