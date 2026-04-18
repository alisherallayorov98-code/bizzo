import * as request from 'supertest'
import * as bcrypt from 'bcrypt'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from './helpers/app.factory'
import { PrismaMock } from '../mocks/prisma.mock'

describe('Auth (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaMock
  let token: string
  const auth = () => ({ Authorization: `Bearer ${token}` })

  beforeAll(async () => {
    const ctx = await createTestApp()
    app = ctx.app
    prisma = ctx.prisma
    token = ctx.token
    ;(prisma as any).auditLog = { create: jest.fn().mockResolvedValue({}) }
  })

  afterAll(async () => { await app.close() })

  const mkUser = async (password = 'Password@123') => ({
    id: 'u1', companyId: 'c1', email: 'a@b.com',
    firstName: 'A', lastName: 'B', role: 'ADMIN',
    permissions: {}, passwordHash: await bcrypt.hash(password, 4),
    isActive: true,
    company: { id: 'c1', name: 'Co', logo: null, plan: 'STARTER', isActive: true, modules: [] },
  })

  describe('POST /auth/login (public)', () => {
    it('returns 200 + tokens on valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(await mkUser())
      prisma.user.update.mockResolvedValue({})
      prisma.refreshToken.create.mockResolvedValue({})

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'Password@123' })
        .expect(200)
      expect(res.body.accessToken).toBeDefined()
      expect(res.body.user.email).toBe('a@b.com')
    })

    it('returns 401 on wrong password', async () => {
      prisma.user.findFirst.mockResolvedValue(await mkUser())
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'WrongPass123' })
        .expect(401)
    })

    it('returns 400 on invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-email', password: 'Password@123' })
        .expect(400)
    })
  })

  describe('GET /auth/me', () => {
    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401)
    })

    it('returns current user with valid token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B',
        role: 'ADMIN', permissions: {},
        company: { id: 'c1', name: 'Co', logo: null, plan: 'STARTER', modules: [] },
      })
      const res = await request(app.getHttpServer()).get('/auth/me').set(auth()).expect(200)
      expect(res.body.user.email).toBe('a@b.com')
    })
  })
})
