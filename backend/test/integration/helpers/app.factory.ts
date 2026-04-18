import { INestApplication, ValidationPipe, CanActivate, Injectable } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { AppModule } from '../../../src/app.module'
import { PrismaService } from '../../../src/prisma/prisma.service'
import { ThrottlerGuard } from '@nestjs/throttler'
import { createPrismaMock, PrismaMock } from '../../mocks/prisma.mock'

@Injectable()
export class NoopThrottlerGuard implements CanActivate {
  canActivate(): boolean { return true }
}

export async function createTestApp(): Promise<{
  app: INestApplication
  prisma: PrismaMock
  token: string
}> {
  const prisma = createPrismaMock()

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService).useValue(prisma)
    .overrideGuard(ThrottlerGuard).useValue(new NoopThrottlerGuard())
    .compile()

  const app = moduleRef.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }))
  await app.init()

  const jwt = moduleRef.get(JwtService)
  const token = await jwt.signAsync(
    { sub: 'u1', companyId: 'c1', email: 'a@b.com', role: 'ADMIN' },
    { secret: process.env.JWT_SECRET, expiresIn: '1h' },
  )

  // Jwt strategy foydalanuvchini bazadan qidiradi — default mock
  prisma.user.findUnique.mockResolvedValue({
    id: 'u1', companyId: 'c1', email: 'a@b.com', role: 'ADMIN',
    isActive: true, permissions: {},
    company: { id: 'c1', name: 'Co', isActive: true },
  })
  prisma.user.findFirst.mockResolvedValue({
    id: 'u1', companyId: 'c1', email: 'a@b.com', role: 'ADMIN',
    isActive: true, permissions: {},
    company: { id: 'c1', name: 'Co', isActive: true, modules: [] },
  })

  return { app, prisma, token }
}
