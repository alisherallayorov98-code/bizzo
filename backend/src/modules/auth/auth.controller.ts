import {
  Controller, Post, Get, Body, Res, Req,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiOkResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

const REFRESH_COOKIE = 'refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 kun (ms)
  path:     '/',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================
  // LOGIN
  // ============================================
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tizimga kirish' })
  @ApiOkResponse({ description: 'Muvaffaqiyatli kirish, access token qaytariladi' })
  @ApiUnauthorizedResponse({ description: "Email yoki parol noto'g'ri" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(dto, ipAddress, userAgent);

    // Refresh tokenni httpOnly cookie ga saqlash
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);

    return {
      accessToken: result.accessToken,
      user:        result.user,
    };
  }

  // ============================================
  // TOKEN YANGILASH (SILENT REFRESH)
  // ============================================
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access tokenni yangilash (silent refresh)' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user         = req.user as any;
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;

    const result = await this.authService.refresh(
      user.sub,
      user.companyId,
      refreshToken,
    );

    // Yangi refresh tokenni cookie ga saqlash
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);

    return {
      accessToken: result.accessToken,
      user:        result.user,
    };
  }

  // ============================================
  // LOGOUT
  // ============================================
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tizimdan chiqish' })
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    await this.authService.logout(user.id, refreshToken);

    // Cookieni o'chirish
    res.clearCookie(REFRESH_COOKIE, { path: '/' });

    return { message: 'Muvaffaqiyatli chiqildi' };
  }

  // ============================================
  // JORIY FOYDALANUVCHI
  // ============================================
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Joriy foydalanuvchi ma'lumotlari" })
  async me(@CurrentUser() user: any) {
    const fullUser = await this.authService.getMe(user.id);
    return { user: fullUser };
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================
  @Post('request-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Email tasdiqlash xati yuborish' })
  async requestVerification(@CurrentUser() user: any) {
    return this.authService.requestEmailVerification(user.id);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email tasdiqlash tokenini tekshirish' })
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // ============================================
  // PASSWORD RESET
  // ============================================
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parolni tiklash xatini yuborish' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parolni tiklash' })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }
}
