import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

interface BruteForceRecord {
  count:        number;
  blockedUntil?: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory brute force himoya (production da Redis ishlatiladi)
  private readonly loginAttempts = new Map<string, BruteForceRecord>();

  private readonly MAX_ATTEMPTS   = 5;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 daqiqa

  constructor(
    private readonly prisma:       PrismaService,
    private readonly jwtService:   JwtService,
    private readonly emailService: EmailService,
  ) {}

  // ============================================
  // EMAIL VERIFICATION
  // ============================================
  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Foydalanuvchi topilmadi');
    if (user.emailVerified) return { message: 'Email allaqachon tasdiqlangan' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailVerification.create({
      data: { userId: user.id, token, expiresAt },
    });

    await this.emailService.sendVerificationEmail(
      user.email,
      user.firstName || user.email,
      token,
      user.companyId,
    );

    return { message: 'Tasdiqlash xati yuborildi' };
  }

  async verifyEmail(token: string) {
    const rec = await this.prisma.emailVerification.findUnique({ where: { token } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
      throw new BadRequestException("Token yaroqsiz yoki muddati o'tgan");
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: rec.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerification.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { message: 'Email muvaffaqiyatli tasdiqlandi' };
  }

  // ============================================
  // PASSWORD RESET
  // ============================================
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isActive: true },
    });
    // Har doim muvaffaqiyat qaytarish (email enumeration himoyasi)
    if (!user) return { message: 'Agar email ro\'yxatdan o\'tgan bo\'lsa, xat yuborildi' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 soat

    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.firstName || user.email,
      token,
      user.companyId,
    );

    return { message: 'Agar email ro\'yxatdan o\'tgan bo\'lsa, xat yuborildi' };
  }

  async resetPassword(token: string, newPassword: string) {
    const rec = await this.prisma.passwordReset.findUnique({ where: { token } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
      throw new BadRequestException("Token yaroqsiz yoki muddati o'tgan");
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: rec.userId },
        data: { passwordHash: hash },
      }),
      this.prisma.passwordReset.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: rec.userId } }),
    ]);
    return { message: 'Parol muvaffaqiyatli tiklandi' };
  }

  // ============================================
  // LOGIN
  // ============================================
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const key = dto.email.toLowerCase().trim();

    // Brute force blokini tekshirish
    this.checkBruteForce(key);

    // Foydalanuvchini topish
    const user = await this.prisma.user.findFirst({
      where: { email: key, isActive: true },
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

    // Parol tekshirish
    const isPasswordValid = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !isPasswordValid) {
      this.recordFailedAttempt(key);

      // Muvaffaqiyatsiz login auditga
      if (user) {
        await this.prisma.auditLog.create({
          data: {
            companyId: user.companyId,
            userId:    user.id,
            action:    'LOGIN_FAILED',
            entity:    'User',
            entityId:  user.id,
            ipAddress,
            userAgent,
          },
        }).catch(() => {});
      }

      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }

    // Kompaniya aktiv tekshirish
    if (!user.company.isActive) {
      throw new ForbiddenException("Kompaniya hisobi to'xtatilgan");
    }

    // Muvaffaqiyatli login — blokni tozalash
    this.loginAttempts.delete(key);

    // Tokenlar yaratish
    const tokens = await this.generateTokens(user.id, user.companyId, user.email, user.role);

    // Oxirgi kirish vaqtini yangilash
    await this.prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    }).catch(() => {});

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId:    user.id,
        action:    'LOGIN_SUCCESS',
        entity:    'User',
        entityId:  user.id,
        ipAddress,
        userAgent,
      },
    }).catch(() => {});

    // Faol modullar
    const activeModules = user.company.modules
      .filter(m => !m.expiresAt || m.expiresAt > new Date())
      .map(m => m.moduleType as string);

    return {
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id:          user.id,
        email:       user.email,
        firstName:   user.firstName,
        lastName:    user.lastName,
        role:        user.role,
        permissions: (user.permissions as Record<string, boolean>) || {},
        company: {
          id:      user.company.id,
          name:    user.company.name,
          logo:    user.company.logo,
          plan:    user.company.plan,
          modules: activeModules,
        },
      },
    };
  }

  // ============================================
  // SILENT REFRESH
  // ============================================
  async refresh(userId: string, companyId: string, oldRefreshToken: string) {
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        token:     oldRefreshToken,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) {
      throw new UnauthorizedException("Refresh token yaroqsiz yoki muddati o'tgan");
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId, isActive: true },
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

    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    // Eski tokenni o'chirish (rotation)
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(user.id, user.companyId, user.email, user.role);

    const activeModules = user.company.modules
      .filter(m => !m.expiresAt || m.expiresAt > new Date())
      .map(m => m.moduleType as string);

    return {
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id:          user.id,
        email:       user.email,
        firstName:   user.firstName,
        lastName:    user.lastName,
        role:        user.role,
        permissions: (user.permissions as Record<string, boolean>) || {},
        company: {
          id:      user.company.id,
          name:    user.company.name,
          logo:    user.company.logo,
          plan:    user.company.plan,
          modules: activeModules,
        },
      },
    };
  }

  // ============================================
  // LOGOUT
  // ============================================
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    } else {
      // Barcha sessiyalarni tugatish
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
  }

  // ============================================
  // JORIY FOYDALANUVCHI
  // ============================================
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: {
            modules: { where: { isActive: true }, select: { moduleType: true } },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    return {
      id:          user.id,
      email:       user.email,
      firstName:   user.firstName,
      lastName:    user.lastName,
      role:        user.role,
      permissions: (user.permissions as Record<string, boolean>) || {},
      company: {
        id:      user.company.id,
        name:    user.company.name,
        logo:    user.company.logo,
        plan:    user.company.plan,
        modules: user.company.modules.map(m => m.moduleType as string),
      },
    };
  }

  // ============================================
  // PAROL O'ZGARTIRISH
  // ============================================
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Foydalanuvchi topilmadi');

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException("Eski parol noto'g'ri");

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data:  { passwordHash: hash },
    });

    // Barcha sessiyalarni tugatish
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  // ============================================
  // PRIVATE METODLAR
  // ============================================
  private async generateTokens(
    userId: string,
    companyId: string,
    email: string,
    role: string,
  ) {
    const payload = { sub: userId, companyId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:    process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret:    process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
      }),
    ]);

    // Refresh tokenni bazaga saqlash
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token:     refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private checkBruteForce(key: string) {
    const record = this.loginAttempts.get(key);
    if (record?.blockedUntil && record.blockedUntil > new Date()) {
      const remainMin = Math.ceil(
        (record.blockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Juda ko'p urinish. ${remainMin} daqiqadan so'ng qayta urining.`,
      );
    }
  }

  private recordFailedAttempt(key: string) {
    const current = this.loginAttempts.get(key) || { count: 0 };
    current.count += 1;

    if (current.count >= this.MAX_ATTEMPTS) {
      current.blockedUntil = new Date(Date.now() + this.BLOCK_DURATION);
      current.count = 0;
      this.logger.warn(`Brute force blok: ${key}`);
    }

    this.loginAttempts.set(key, current);
  }
}
