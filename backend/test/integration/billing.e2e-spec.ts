import * as request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from './helpers/app.factory'
import { PrismaMock } from '../mocks/prisma.mock'

describe('Billing (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaMock
  let token: string
  const auth = () => ({ Authorization: `Bearer ${token}` })

  beforeAll(async () => {
    const ctx = await createTestApp()
    app = ctx.app
    prisma = ctx.prisma
    token = ctx.token
  })

  afterAll(async () => { await app.close() })

  describe('GET /billing/plans (public)', () => {
    it('returns active plans list', async () => {
      prisma.billingPlan.findMany.mockResolvedValue([
        { id: 'p1', name: 'STARTER', displayName: 'Boshlovchi', priceMonthly: 99000 },
      ])
      const res = await request(app.getHttpServer()).get('/billing/plans').expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body[0].name).toBe('STARTER')
    })
  })

  describe('GET /billing/subscription', () => {
    it('returns current subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 's1', companyId: 'c1', planId: 'p1', status: 'ACTIVE',
        plan: { id: 'p1', name: 'STARTER' },
      })
      const res = await request(app.getHttpServer())
        .get('/billing/subscription').set(auth()).expect(200)
      expect(res.body.id).toBe('s1')
    })
  })

  describe('POST /billing/webhook/payme (public)', () => {
    it('returns unauthorized error when auth header missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/billing/webhook/payme')
        .send({ method: 'CheckPerformTransaction', params: {}, id: 1 })
        .expect(200)
      expect(res.body.error.code).toBe(-32504)
    })
  })
})
