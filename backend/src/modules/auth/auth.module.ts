import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Tokenlar har biri uchun alohida secret (signAsync da beriladi)
    JwtModule.register({}),
    EmailModule,
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports:     [AuthService],
})
export class AuthModule {}
