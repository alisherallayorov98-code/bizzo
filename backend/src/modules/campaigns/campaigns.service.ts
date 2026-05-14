import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { SmsService }   from '../integrations/sms/sms.service'

interface CreateCampaignDto {
  name:          string
  type:          'SMS' | 'EMAIL'
  subject?:      string
  body:          string
  targetFilter?: { contactType?: string; region?: string }
  scheduledAt?:  string
}

interface CampaignFilters {
  status?: string
  type?:   string
  page?:   number
  limit?:  number
}

@Injectable()
export class CampaignsService {
  constructor(
    private prisma:  PrismaService,
    private sms:     SmsService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        companyId,
        name:         dto.name,
        type:         dto.type,
        subject:      dto.subject,
        body:         dto.body,
        targetFilter: dto.targetFilter ?? {},
        scheduledAt:  dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById:  userId,
      },
    })
  }

  async list(companyId: string, filters: CampaignFilters) {
    const page  = filters.page  || 1
    const limit = filters.limit || 20
    const where: any = { companyId }
    if (filters.status) where.status = filters.status
    if (filters.type)   where.type   = filters.type

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      this.prisma.campaign.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async findOne(companyId: string, id: string) {
    const c = await this.prisma.campaign.findFirst({
      where:   { id, companyId },
      include: {
        logs: {
          take:    50,
          orderBy: { sentAt: 'desc' },
          include: { contact: { select: { id: true, name: true, phone: true, email: true } } },
        },
      },
    })
    if (!c) throw new NotFoundException('Kampaniya topilmadi')
    return c
  }

  async update(companyId: string, id: string, dto: Partial<CreateCampaignDto>) {
    const c = await this.prisma.campaign.findFirst({ where: { id, companyId } })
    if (!c) throw new NotFoundException()
    if (c.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT tahrirlanadi')
    return this.prisma.campaign.update({
      where: { id },
      data: {
        name:         dto.name,
        subject:      dto.subject,
        body:         dto.body,
        targetFilter: dto.targetFilter as any,
        scheduledAt:  dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    })
  }

  private buildContactWhere(companyId: string, filter: any) {
    const where: any = { companyId, isActive: true }
    if (filter?.contactType && filter.contactType !== 'ALL') where.type = filter.contactType
    if (filter?.region) where.region = { contains: filter.region, mode: 'insensitive' }
    return where
  }

  async previewCount(companyId: string, filter: any) {
    const where = this.buildContactWhere(companyId, filter)
    const count = await this.prisma.contact.count({ where })
    return { count }
  }

  async send(companyId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, companyId } })
    if (!campaign) throw new NotFoundException()
    if (campaign.status !== 'DRAFT') throw new BadRequestException('Bu kampaniya allaqachon yuborilgan')

    await this.prisma.campaign.update({ where: { id }, data: { status: 'SENDING' } })

    const filter   = campaign.targetFilter as any
    const contacts = await this.prisma.contact.findMany({
      where:  this.buildContactWhere(companyId, filter),
      select: { id: true, name: true, phone: true, email: true },
    })

    let totalSent = 0, totalFailed = 0

    for (const contact of contacts) {
      let success = false
      let error: string | undefined

      try {
        if (campaign.type === 'SMS') {
          if (!contact.phone) { error = 'Telefon raqam yo\'q'; }
          else {
            const result = await this.sms.send(companyId, contact.phone, campaign.body)
            success = result.success
            error   = result.error
          }
        } else {
          // EMAIL — basic log without actual sending (email integration optional)
          success = !!contact.email
          if (!contact.email) error = 'Email yo\'q'
        }
      } catch (e: any) {
        error = e?.message ?? 'Xatolik'
      }

      await this.prisma.campaignLog.create({
        data: {
          campaignId: id,
          contactId:  contact.id,
          status:     success ? 'SENT' : 'FAILED',
          error:      error,
          sentAt:     success ? new Date() : null,
        },
      })

      if (success) totalSent++; else totalFailed++
    }

    return this.prisma.campaign.update({
      where: { id },
      data:  { status: 'COMPLETED', totalSent, totalFailed, sentAt: new Date() },
    })
  }

  async remove(companyId: string, id: string) {
    const c = await this.prisma.campaign.findFirst({ where: { id, companyId } })
    if (!c) throw new NotFoundException()
    if (c.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT o\'chiriladi')
    await this.prisma.campaign.delete({ where: { id } })
    return { ok: true }
  }
}
