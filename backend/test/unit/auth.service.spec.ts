import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AuthService } from '../../src/modules/auth/auth.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { EmailService } from '../../src/modules/email/email.service'
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock'

describe('AuthService', () => {
  let service: AuthService
  let prisma: PrismaMock
  let jwt: { signAsync: jest.Mock }

  beforeEach(async () => {
    prisma = createPrismaMock()
    jwt = { signAsync: jest.fn().mockResolvedValue('token-xyz') }

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: EmailService, useValue: {
          sendVerificationEmail: jest.fn(),
          sendPasswordResetEmail: jest.fn(),
          sendWelcomeEmail: jest.fn(),
        } },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  const userFixture = async (password = 'Password@123') => ({
    id: 'u1', companyId: 'c1', email: 'a@b.com',
    firstName: 'A', lastName: 'B', role: 'ADMIN',
    permissions: {}, passwordHash: await bcrypt.hash(password, 4),
    isActive: true,
    company: { id: 'c1', name: 'Co', logo: null, plan: 'STARTER', isActive: true, modules: [] },
  })

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(await userFixture())
      prisma.user.update.mockResolvedValue({})
      prisma.auditLog = { create: jest.fn().mockResolvedValue({}) } as any
      prisma.refreshToken.create.mockResolvedValue({})

      const res = await service.login({ email: 'a@b.com', password: 'Password@123' } as any)
      expect(res.accessToken).toBe('token-xyz')
      expect(res.refreshToken).toBe('token-xyz')
      expect(res.user.email).toBe('a@b.com')
    })

    it('throws UnauthorizedException on wrong password', async () => {
      prisma.user.findFirst.mockResolvedValue(await userFixture())
      prisma.auditLog = { create: jest.fn().mockResolvedValue({}) } as any
      await expect(service.login({ email: 'a@b.com', password: 'wrong' } as any))
        .rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null)
      await expect(service.login({ email: 'x@x.com', password: 'any' } as any))
        .rejects.toThrow(UnauthorizedException)
    })

    it('throws ForbiddenException when company inactive', async () => {
      const u = await userFixture()
      u.company.isActive = false
      prisma.user.findFirst.mockResolvedValue(u)
      prisma.auditLog = { create: jest.fn().mockResolvedValue({}) } as any
      await expect(service.login({ email: 'a@b.com', password: 'Password@123' } as any))
        .rejects.toThrow(ForbiddenException)
    })
  })

  describe('refresh', () => {
    it('returns new tokens for valid refresh token', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt1', userId: 'u1', token: 'old' })
      prisma.refreshToken.delete.mockResolvedValue({})
      prisma.refreshToken.create.mockResolvedValue({})
      prisma.user.findFirst.mockResolvedValue(await userFixture())

      const res = await service.refresh('u1', 'c1', 'old')
      expect(res.accessToken).toBe('token-xyz')
    })

    it('throws UnauthorizedException for invalid refresh token', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null)
      await expect(service.refresh('u1', 'c1', 'bad')).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('logout', () => {
    it('deletes refresh token', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 })
      await service.logout('u1', 'tok')
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', token: 'tok' },
      })
    })

    it('deletes all sessions when token not provided', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 })
      await service.logout('u1')
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    })
  })
})
