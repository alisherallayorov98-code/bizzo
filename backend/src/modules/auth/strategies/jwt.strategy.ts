import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub:       string;
  companyId: string;
  email:     string;
  role:      string;
  iat:       number;
  exp:       number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new InternalServerErrorException('JWT_SECRET env o\'rnatilmagan');
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        id:        payload.sub,
        companyId: payload.companyId,
        isActive:  true,
      },
      include: {
        company: {
          include: {
            modules: {
              where:  { isActive: true },
              select: { moduleType: true, expiresAt: true },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Token yaroqsiz');

    const activeModules = user.company.modules
      .filter(m => !m.expiresAt || m.expiresAt > new Date())
      .map(m => m.moduleType);

    return {
      id:          user.id,
      email:       user.email,
      firstName:   user.firstName,
      lastName:    user.lastName,
      role:        user.role,
      permissions: user.permissions,
      companyId:   user.companyId,
      company: {
        id:      user.company.id,
        name:    user.company.name,
        logo:    user.company.logo,
        plan:    user.company.plan,
        modules: activeModules,
      },
    };
  }
}
