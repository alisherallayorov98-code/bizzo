import * as request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from './helpers/app.factory'
import { PrismaMock } from '../mocks/prisma.mock'

describe('Contacts (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaMock
  let token: string
  const auth = () => ({ Authorization: `Bearer ${token}` })

  beforeAll(async () => {
    const ctx = await createTestApp()
    app = ctx.app
    prisma = ctx.prisma
    token = ctx.token
    ;(prisma as any).debtRecord = { groupBy: jest.fn().mockResolvedValue([]), findFirst: jest.fn() }
  })

  afterAll(async () => { await app.close() })

  describe('POST /contacts', () => {
    it('creates contact and returns 201', async () => {
      prisma.contact.create.mockResolvedValue({ id: 'k1', name: 'ACME', type: 'CUSTOMER' })
      const res = await request(app.getHttpServer())
        .post('/contacts').set(auth())
        .send({ name: 'ACME', type: 'CUSTOMER' })
        .expect(201)
      expect(res.body.id).toBe('k1')
    })

    it('returns 400 on missing name', async () => {
      await request(app.getHttpServer())
        .post('/contacts').set(auth())
        .send({ type: 'CUSTOMER' })
        .expect(400)
    })
  })

  describe('GET /contacts', () => {
    it('returns paginated list', async () => {
      prisma.contact.findMany.mockResolvedValue([{ id: 'k1', debtRecords: [] }])
      prisma.contact.count.mockResolvedValue(1)
      const res = await request(app.getHttpServer()).get('/contacts').set(auth()).expect(200)
      expect(res.body).toHaveProperty('data')
    })
  })

  describe('GET /contacts/:id', () => {
    it('returns 404 when contact missing', async () => {
      prisma.contact.findFirst.mockResolvedValue(null)
      await request(app.getHttpServer()).get('/contacts/nope').set(auth()).expect(404)
    })
  })
})
