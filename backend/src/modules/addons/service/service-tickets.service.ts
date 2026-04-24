import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { ServiceStatus, ServicePriority, Prisma } from '@prisma/client'

export interface CreateTicketDto {
  title:       string
  description?: string
  contactId?:   string
  priority?:    ServicePriority
  dueDate?:     string
  notes?:       string
}

export interface UpdateTicketDto {
  title?:       string
  description?: string
  status?:      ServiceStatus
  priority?:    ServicePriority
  assigneeId?:  string
  dueDate?:     string
  notes?:       string
}

@Injectable()
export class ServiceTicketsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query: {
    status?:    string
    priority?:  string
    contactId?: string
    search?:    string
    page?:      number
    limit?:     number
  }) {
    const { contactId, search, page = 1, limit = 30 } = query

    const where: Prisma.ServiceTicketWhereInput = {
      companyId,
      ...(query.status   && { status:   query.status   as ServiceStatus }),
      ...(query.priority && { priority: query.priority as ServicePriority }),
      ...(contactId      && { contactId }),
      ...(search         && {
        OR: [
          { title:       { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [total, data] = await Promise.all([
      this.prisma.serviceTicket.count({ where }),
      this.prisma.serviceTicket.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          contact: { select: { id: true, name: true, phone: true } },
        },
      }),
    ])

    return {
      success: true,
      data: {
        data,
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    }
  }

  async findOne(companyId: string, id: string) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where:   { id, companyId },
      include: { contact: { select: { id: true, name: true, phone: true, email: true } } },
    })
    if (!ticket) throw new NotFoundException('Tiket topilmadi')
    return { success: true, data: ticket }
  }

  async create(companyId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.serviceTicket.create({
      data: {
        companyId,
        title:       dto.title,
        description: dto.description,
        contactId:   dto.contactId,
        priority:    dto.priority ?? 'MEDIUM',
        dueDate:     dto.dueDate ? new Date(dto.dueDate) : null,
        notes:       dto.notes,
      },
      include: { contact: { select: { id: true, name: true } } },
    })
    return { success: true, data: ticket }
  }

  async update(companyId: string, id: string, dto: UpdateTicketDto) {
    const existing = await this.prisma.serviceTicket.findFirst({ where: { id, companyId } })
    if (!existing) throw new NotFoundException('Tiket topilmadi')

    const resolvedAt =
      dto.status === 'RESOLVED' && existing.status !== 'RESOLVED'
        ? new Date()
        : dto.status && ['OPEN', 'IN_PROGRESS', 'WAITING'].includes(dto.status)
        ? null
        : undefined

    const ticket = await this.prisma.serviceTicket.update({
      where: { id },
      data: {
        ...(dto.title       !== undefined && { title:       dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status      !== undefined && { status:      dto.status as ServiceStatus }),
        ...(dto.priority    !== undefined && { priority:    dto.priority as ServicePriority }),
        ...(dto.assigneeId  !== undefined && { assigneeId:  dto.assigneeId }),
        ...(dto.dueDate     !== undefined && { dueDate:     dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.notes       !== undefined && { notes:       dto.notes }),
        ...(resolvedAt      !== undefined && { resolvedAt }),
      },
      include: { contact: { select: { id: true, name: true } } },
    })
    return { success: true, data: ticket }
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.serviceTicket.findFirst({ where: { id, companyId } })
    if (!existing) throw new NotFoundException('Tiket topilmadi')
    await this.prisma.serviceTicket.delete({ where: { id } })
    return { success: true }
  }

  async getStats(companyId: string) {
    const [total, open, inProgress, resolved] = await Promise.all([
      this.prisma.serviceTicket.count({ where: { companyId } }),
      this.prisma.serviceTicket.count({ where: { companyId, status: 'OPEN' } }),
      this.prisma.serviceTicket.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      this.prisma.serviceTicket.count({ where: { companyId, status: 'RESOLVED' } }),
    ])
    return { total, open, inProgress, resolved, closed: total - open - inProgress - resolved }
  }
}
